import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { composeFollowUpEmail } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { dealId, contactId, senderId } = await req.json();
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
  if (deal.company_id) {
    const { data: c } = await supabase
      .from("companies")
      .select("name")
      .eq("id", deal.company_id)
      .single();
    companyName = c?.name ?? null;
  }

  let contactName: string | null = null;
  let contactEmail: string | null = null;
  if (contactId) {
    const { data: c } = await supabase
      .from("contacts")
      .select("name, email")
      .eq("id", contactId)
      .single();
    contactName = c?.name ?? null;
    contactEmail = c?.email ?? null;
  } else if (deal.company_id) {
    const { data: cs } = await supabase
      .from("contacts")
      .select("name, email")
      .eq("company_id", deal.company_id)
      .limit(1);
    contactName = cs?.[0]?.name ?? null;
    contactEmail = cs?.[0]?.email ?? null;
  }

  let senderName: string | null = null;
  const ownerId = senderId ?? deal.owner_id;
  if (ownerId) {
    const { data: u } = await supabase
      .from("users")
      .select("name")
      .eq("id", ownerId)
      .single();
    senderName = u?.name ?? null;
  }

  const { data: activities } = await supabase
    .from("activities")
    .select("type, body, occurred_at, signal")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  const draft = await composeFollowUpEmail({
    dealName: deal.name,
    companyName,
    stage: deal.stage,
    nextAction: deal.next_action,
    summary: deal.ai_summary,
    contactName,
    senderName,
    activities: activities ?? [],
  });

  return NextResponse.json({
    subject: draft.subject,
    body: draft.body,
    to: contactEmail,
    contact_name: contactName,
  });
}
