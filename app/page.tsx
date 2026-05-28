import { createServerClient } from "@/lib/supabase";
import { mondayBriefing } from "@/lib/anthropic";
import KanbanBoard from "@/components/KanbanBoard";
import AppShell from "@/components/AppShell";
import { Sparkles } from "lucide-react";
import type {
  Activity,
  Company,
  Contact,
  Deal,
  DealWithRelations,
  User,
} from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerClient();

  const [
    { data: deals },
    { data: companies },
    { data: users },
    { data: activities },
    { data: contacts },
  ] = await Promise.all([
    supabase.from("deals").select("*").order("stage_changed_at", { ascending: false }),
    supabase.from("companies").select("*"),
    supabase.from("users").select("*"),
    supabase.from("activities").select("*").order("occurred_at", { ascending: false }),
    supabase.from("contacts").select("*"),
  ]);

  const companyMap = new Map<string, Company>((companies ?? []).map((c: Company) => [c.id, c]));
  const userMap = new Map<string, User>((users ?? []).map((u: User) => [u.id, u]));

  const enriched: DealWithRelations[] = (deals ?? []).map((d: Deal) => ({
    ...d,
    company: companyMap.get(d.company_id) ?? null,
    owner: userMap.get(d.owner_id) ?? null,
  }));

  const open = enriched.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const totalValue = open.reduce((s, d) => s + (d.value_cents ?? 0), 0);
  const highRisk = open.filter((d) => d.risk === "high").length;
  const stalled = open.filter(
    (d) => (Date.now() - new Date(d.stage_changed_at).getTime()) / 86400000 > 14
  ).length;
  const closingThisWeek = open.filter((d) => {
    if (!d.expected_close) return false;
    const days = (new Date(d.expected_close).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;
  const top = [...open].sort((a, b) => b.value_cents - a.value_cents)[0];

  const briefing = await mondayBriefing({
    total_deals: open.length,
    total_value_cents: totalValue,
    high_risk: highRisk,
    closing_this_week: closingThisWeek,
    stalled,
    top_deal_name: top?.name ?? null,
    top_deal_value_cents: top?.value_cents ?? 0,
  });

  return (
    <AppShell
      active="pipeline"
      users={users ?? []}
      pageTitle="Pipeline"
      pageMeta={`${enriched.length} deals · $${(totalValue / 100000).toFixed(0)}k open`}
    >
      <section className="bg-paper border-b border-hairline">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center gap-3">
          <Sparkles size={14} className="text-forest shrink-0" />
          <div
            className="text-[10px] uppercase font-semibold text-inkSoft shrink-0"
            style={{ letterSpacing: "0.18em" }}
          >
            Monday briefing
          </div>
          <p className="font-display italic text-[14px] leading-snug text-inkDeep">
            {briefing}
          </p>
        </div>
      </section>

      <KanbanBoard
        deals={enriched}
        activities={(activities ?? []) as Activity[]}
        users={users ?? []}
        contacts={(contacts ?? []) as Contact[]}
        companies={(companies ?? []) as Company[]}
      />
    </AppShell>
  );
}
