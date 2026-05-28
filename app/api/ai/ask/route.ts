import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { askPipeline, type AskDeal } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  const supabase = createServerClient();
  const [{ data: deals }, { data: companies }, { data: users }, { data: activities }] =
    await Promise.all([
      supabase.from("deals").select("*"),
      supabase.from("companies").select("id, name"),
      supabase.from("users").select("id, name"),
      supabase.from("activities").select("deal_id, occurred_at").order("occurred_at", { ascending: false }),
    ]);

  const companyMap = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const userMap = new Map((users ?? []).map((u) => [u.id, u.name]));
  const lastActivityMap = new Map<string, string>();
  for (const a of activities ?? []) {
    if (!lastActivityMap.has(a.deal_id)) lastActivityMap.set(a.deal_id, a.occurred_at);
  }

  const now = Date.now();
  const snapshot: AskDeal[] = (deals ?? []).map((d) => {
    const last = lastActivityMap.get(d.id);
    return {
      id: d.id,
      name: d.name,
      company: companyMap.get(d.company_id) ?? null,
      stage: d.stage,
      value_cents: d.value_cents,
      days_in_stage: Math.floor((now - new Date(d.stage_changed_at).getTime()) / 86400000),
      days_since_activity: last
        ? Math.floor((now - new Date(last).getTime()) / 86400000)
        : null,
      risk: d.risk,
      owner: userMap.get(d.owner_id) ?? null,
    };
  });

  const answer = await askPipeline(question, snapshot);
  return NextResponse.json({ answer });
}
