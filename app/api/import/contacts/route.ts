import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type IncomingContact = {
  name: string;
  title?: string;
  email?: string;
  company?: string;
  company_id?: string;
};

export async function POST(req: NextRequest) {
  const { rows } = (await req.json()) as { rows: IncomingContact[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: companies } = await supabase.from("companies").select("id, name, domain");

  const byName = new Map<string, string>();
  const byDomain = new Map<string, string>();
  (companies ?? []).forEach((c) => {
    if (c.name) byName.set(c.name.toLowerCase().trim(), c.id);
    if (c.domain) byDomain.set(c.domain.toLowerCase().trim(), c.id);
  });

  const inserts: {
    name: string;
    title: string | null;
    email: string | null;
    company_id: string;
  }[] = [];
  const skipped: { row: IncomingContact; reason: string }[] = [];
  const createdCompanies: { name: string; id: string }[] = [];

  for (const r of rows) {
    if (!r.name) {
      skipped.push({ row: r, reason: "missing name" });
      continue;
    }
    let companyId = r.company_id ?? "";
    if (!companyId && r.company) {
      const key = r.company.toLowerCase().trim();
      companyId = byName.get(key) ?? "";
      if (!companyId && r.email) {
        const domain = r.email.split("@")[1]?.toLowerCase().trim();
        if (domain) companyId = byDomain.get(domain) ?? "";
      }
      if (!companyId) {
        const domain = r.email?.split("@")[1]?.toLowerCase().trim() ?? null;
        const { data: newCompany, error: cErr } = await supabase
          .from("companies")
          .insert({
            name: r.company,
            domain,
            logo_url: domain ? `https://logo.clearbit.com/${domain}` : null,
          })
          .select()
          .single();
        if (cErr || !newCompany) {
          skipped.push({ row: r, reason: "company create failed" });
          continue;
        }
        companyId = newCompany.id;
        byName.set(key, companyId);
        if (domain) byDomain.set(domain, companyId);
        createdCompanies.push({ name: r.company, id: companyId });
      }
    }
    if (!companyId) {
      skipped.push({ row: r, reason: "no company" });
      continue;
    }
    inserts.push({
      name: r.name,
      title: r.title || null,
      email: r.email || null,
      company_id: companyId,
    });
  }

  if (inserts.length === 0) {
    return NextResponse.json({ inserted: 0, skipped, createdCompanies });
  }

  const { data, error } = await supabase.from("contacts").insert(inserts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    inserted: data?.length ?? 0,
    skipped,
    createdCompanies,
  });
}
