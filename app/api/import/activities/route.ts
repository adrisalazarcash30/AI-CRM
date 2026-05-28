import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type IncomingActivity = {
  deal?: string;
  deal_id?: string;
  type?: string;
  body?: string;
  raw_input?: string;
  signal?: string;
  occurred_at?: string;
  user_email?: string;
  contact_name?: string;
};

const ALLOWED_TYPES = new Set(["call", "email", "meeting", "note", "demo", "task"]);

export async function POST(req: NextRequest) {
  const { rows } = (await req.json()) as { rows: IncomingActivity[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows" }, { status: 400 });
  }

  const supabase = createServerClient();
  const [{ data: deals }, { data: users }, { data: contacts }] = await Promise.all([
    supabase.from("deals").select("id, name, company_id"),
    supabase.from("users").select("id, email, name"),
    supabase.from("contacts").select("id, name, company_id"),
  ]);

  const dealByName = new Map<string, { id: string; company_id: string }>();
  (deals ?? []).forEach((d) =>
    dealByName.set(d.name.toLowerCase().trim(), { id: d.id, company_id: d.company_id })
  );
  const userByEmail = new Map<string, string>();
  (users ?? []).forEach((u) => {
    if (u.email) userByEmail.set(u.email.toLowerCase().trim(), u.id);
  });
  const contactsByCompany = new Map<string, { id: string; name: string }[]>();
  (contacts ?? []).forEach((c) => {
    if (!contactsByCompany.has(c.company_id)) contactsByCompany.set(c.company_id, []);
    contactsByCompany.get(c.company_id)!.push({ id: c.id, name: c.name });
  });

  const inserts: {
    deal_id: string;
    contact_id: string | null;
    user_id: string | null;
    type: string;
    body: string | null;
    raw_input: string | null;
    signal: string | null;
    occurred_at: string;
  }[] = [];
  const skipped: { row: IncomingActivity; reason: string }[] = [];

  for (const r of rows) {
    let dealId = r.deal_id ?? "";
    let companyId = "";
    if (!dealId && r.deal) {
      const match = dealByName.get(r.deal.toLowerCase().trim());
      if (match) {
        dealId = match.id;
        companyId = match.company_id;
      } else {
        const partial = Array.from(dealByName.entries()).find(([k]) =>
          k.includes(r.deal!.toLowerCase().trim())
        );
        if (partial) {
          dealId = partial[1].id;
          companyId = partial[1].company_id;
        }
      }
    }
    if (!dealId) {
      skipped.push({ row: r, reason: "no matching deal" });
      continue;
    }

    let contactId: string | null = null;
    if (r.contact_name && companyId) {
      const pool = contactsByCompany.get(companyId) ?? [];
      const m = pool.find(
        (c) =>
          c.name.toLowerCase().includes(r.contact_name!.toLowerCase()) ||
          r.contact_name!.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
      );
      contactId = m?.id ?? null;
    }

    const userId = r.user_email
      ? userByEmail.get(r.user_email.toLowerCase().trim()) ?? null
      : null;

    const rawType = (r.type ?? "note").toLowerCase().trim();
    const type = ALLOWED_TYPES.has(rawType) ? rawType : "note";

    let occurred = r.occurred_at?.trim() || new Date().toISOString();
    const parsed = new Date(occurred);
    if (isNaN(parsed.getTime())) occurred = new Date().toISOString();
    else occurred = parsed.toISOString();

    inserts.push({
      deal_id: dealId,
      contact_id: contactId,
      user_id: userId,
      type,
      body: r.body || null,
      raw_input: r.raw_input || r.body || null,
      signal: r.signal || null,
      occurred_at: occurred,
    });
  }

  if (inserts.length === 0) {
    return NextResponse.json({ inserted: 0, skipped });
  }

  const { data, error } = await supabase.from("activities").insert(inserts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, skipped });
}
