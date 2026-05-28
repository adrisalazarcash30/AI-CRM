import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, domain, industry, size_estimate } = await req.json();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      domain: domain || null,
      industry: industry || null,
      size_estimate: size_estimate || null,
      logo_url: domain ? `https://logo.clearbit.com/${domain}` : null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}
