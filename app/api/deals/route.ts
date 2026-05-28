import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, company_id, owner_id, value_cents, stage, expected_close } = body;
  if (!name || !company_id || !owner_id) {
    return NextResponse.json(
      { error: "Missing name, company_id or owner_id" },
      { status: 400 }
    );
  }
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      name,
      company_id,
      owner_id,
      value_cents: value_cents ?? 0,
      stage: stage ?? "lead",
      stage_changed_at: now,
      expected_close: expected_close || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data });
}
