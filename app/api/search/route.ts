import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const term = q.trim();
  const supabase = createServerClient();

  const [{ data: deals }, { data: contacts }, { data: companies }] =
    await Promise.all([
      term
        ? supabase
            .from("deals")
            .select("id, name, value_cents, stage, company_id")
            .ilike("name", `%${term}%`)
            .limit(6)
        : supabase
            .from("deals")
            .select("id, name, value_cents, stage, company_id")
            .order("stage_changed_at", { ascending: false })
            .limit(6),
      term
        ? supabase
            .from("contacts")
            .select("id, name, email, title, company_id")
            .ilike("name", `%${term}%`)
            .limit(6)
        : supabase
            .from("contacts")
            .select("id, name, email, title, company_id")
            .order("name")
            .limit(6),
      term
        ? supabase
            .from("companies")
            .select("id, name, domain, industry")
            .ilike("name", `%${term}%`)
            .limit(6)
        : supabase
            .from("companies")
            .select("id, name, domain, industry")
            .order("name")
            .limit(6),
    ]);

  const companyIds = Array.from(
    new Set([
      ...(deals ?? []).map((d) => d.company_id),
      ...(contacts ?? []).map((c) => c.company_id),
    ])
  ).filter(Boolean);
  let companyNameMap = new Map<string, string>();
  if (companyIds.length) {
    const { data: cs } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    companyNameMap = new Map((cs ?? []).map((c) => [c.id, c.name]));
  }

  return NextResponse.json({
    deals: (deals ?? []).map((d) => ({
      ...d,
      company_name: companyNameMap.get(d.company_id) ?? null,
    })),
    contacts: (contacts ?? []).map((c) => ({
      ...c,
      company_name: companyNameMap.get(c.company_id) ?? null,
    })),
    companies: companies ?? [],
  });
}
