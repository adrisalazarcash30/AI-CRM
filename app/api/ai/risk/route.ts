import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { riskScore } from "@/lib/anthropic";

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

  const { data: activities } = await supabase
    .from("activities")
    .select("occurred_at")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false });

  const lastActivity = activities?.[0]?.occurred_at;
  const lastDaysAgo = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
    : null;
  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.stage_changed_at).getTime()) / 86400000
  );

  const result = await riskScore(
    {
      name: deal.name,
      stage: deal.stage,
      days_in_stage: daysInStage,
      expected_close: deal.expected_close,
    },
    lastDaysAgo,
    activities?.length ?? 0
  );

  const { data: updated } = await supabase
    .from("deals")
    .update({ risk: result.risk, risk_reason: result.reason })
    .eq("id", dealId)
    .select()
    .single();

  return NextResponse.json({ risk: result.risk, reason: result.reason, deal: updated });
}
