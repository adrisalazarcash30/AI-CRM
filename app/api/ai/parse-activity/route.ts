import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { parseActivity } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { dealId, rawText, userId } = await req.json();
  if (!dealId || !rawText) {
    return NextResponse.json({ error: "Missing dealId or rawText" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: deal, error: dealErr } = await supabase
    .from("deals")
    .select("id, name, stage, company_id")
    .eq("id", dealId)
    .single();
  if (dealErr || !deal) {
    return NextResponse.json({ error: dealErr?.message ?? "Deal not found" }, { status: 404 });
  }

  let companyName: string | null = null;
  if (deal.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", deal.company_id)
      .single();
    companyName = company?.name ?? null;
  }

  let contactId: string | null = null;
  let parsed;
  try {
    parsed = await parseActivity(rawText, {
      dealName: deal.name,
      companyName,
      stage: deal.stage,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Claude parse failed" },
      { status: 500 }
    );
  }

  if (parsed.contact_name && deal.company_id) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("company_id", deal.company_id);
    const match = contacts?.find(
      (c) => c.name.toLowerCase().includes(parsed.contact_name!.toLowerCase()) ||
             parsed.contact_name!.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
    );
    contactId = match?.id ?? null;
  }

  const { data: activity, error: insertErr } = await supabase
    .from("activities")
    .insert({
      deal_id: dealId,
      contact_id: contactId,
      user_id: userId ?? null,
      type: parsed.type,
      body: parsed.summary,
      raw_input: rawText,
      signal: parsed.sentiment,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ activity, parsed });
}
