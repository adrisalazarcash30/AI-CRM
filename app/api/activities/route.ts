import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { deal_id, contact_id, user_id, type, body, raw_input, signal, occurred_at } =
    await req.json();
  if (!deal_id) return NextResponse.json({ error: "Missing deal_id" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({
      deal_id,
      contact_id: contact_id ?? null,
      user_id: user_id ?? null,
      type: type ?? "note",
      body: body ?? null,
      raw_input: raw_input ?? null,
      signal: signal ?? null,
      occurred_at: occurred_at ?? new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data });
}
