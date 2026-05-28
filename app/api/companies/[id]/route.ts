import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const ALLOWED = ["name", "domain", "industry", "size_estimate", "logo_url"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const update: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (k in patch) update[k] = patch[k];
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { error } = await supabase.from("companies").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
