import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { dealSummary } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { dealId } = await req.json();
  if (!dealId) return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

  const supabase = createServerClient();

  const { data: deal, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single();
  if (error || !deal) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  let companyName: string | null = null;
  let industry: string | null = null;
  if (deal.company_id) {
    const { data: c } = await supabase
      .from("companies")
      .select("name, industry")
      .eq("id", deal.company_id)
      .single();
    companyName = c?.name ?? null;
    industry = c?.industry ?? null;
  }

  const { data: activities } = await supabase
    .from("activities")
    .select("type, body, occurred_at, signal")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.stage_changed_at).getTime()) / 86400000
  );

  const result = await dealSummary(
    {
      name: deal.name,
      stage: deal.stage,
      value_cents: deal.value_cents,
      expected_close: deal.expected_close,
      company_name: companyName,
      industry,
      days_in_stage: daysInStage,
    },
    activities ?? []
  );

  const { data: updated } = await supabase
    .from("deals")
    .update({ ai_summary: result.summary, next_action: result.next_action })
    .eq("id", dealId)
    .select()
    .single();

  return NextResponse.json({ summary: result.summary, next_action: result.next_action, deal: updated });
}
