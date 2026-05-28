import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, title, email, company_id } = await req.json();
  if (!name || !company_id) {
    return NextResponse.json({ error: "Missing name or company_id" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ name, title: title ?? null, email: email ?? null, company_id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}
