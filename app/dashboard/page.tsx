import { createServerClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import type { Deal, Stage, User } from "@/types";
import { STAGES, STAGE_LABEL, STAGE_PROBABILITY } from "@/types";
import { formatCurrencyFull } from "@/lib/format";
import { TrendingUp, Target, Trophy, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const [{ data: deals }, { data: users }] = await Promise.all([
    supabase.from("deals").select("*"),
    supabase.from("users").select("*"),
  ]);

  const allDeals: Deal[] = deals ?? [];
  const allUsers: User[] = users ?? [];

  const open = allDeals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  );
  const totalPipeline = open.reduce((s, d) => s + (d.value_cents ?? 0), 0);
  const weighted = open.reduce(
    (s, d) => s + (d.value_cents ?? 0) * (STAGE_PROBABILITY[d.stage] ?? 0),
    0
  );

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentlyClosed = allDeals.filter(
    (d) =>
      (d.stage === "closed_won" || d.stage === "closed_lost") &&
      new Date(d.stage_changed_at).getTime() >= thirtyDaysAgo
  );
  const won = recentlyClosed.filter((d) => d.stage === "closed_won");
  const winRate = recentlyClosed.length
    ? Math.round((won.length / recentlyClosed.length) * 100)
    : 0;
  const avgDeal = won.length
    ? won.reduce((s, d) => s + (d.value_cents ?? 0), 0) / won.length
    : 0;

  const byStage = new Map<Stage, number>();
  STAGES.forEach((s) => byStage.set(s, 0));
  allDeals.forEach((d) =>
    byStage.set(d.stage, (byStage.get(d.stage) ?? 0) + (d.value_cents ?? 0))
  );
  const maxStageVal = Math.max(...Array.from(byStage.values()), 1);

  const wonByUser = new Map<string, number>();
  allDeals
    .filter((d) => d.stage === "closed_won")
    .forEach((d) =>
      wonByUser.set(d.owner_id, (wonByUser.get(d.owner_id) ?? 0) + (d.value_cents ?? 0))
    );
  const leaderboard = allUsers
    .map((u) => ({ user: u, won: wonByUser.get(u.id) ?? 0 }))
    .sort((a, b) => b.won - a.won)
    .slice(0, 3);

  return (
    <AppShell
      active="dashboard"
      users={allUsers}
      pageTitle="Dashboard"
      pageMeta="Leader view · last 30 days"
    >
      <div className="max-w-[1600px] mx-auto px-4 py-5 space-y-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-brand font-semibold">
              Dashboard
            </div>
            <h1 className="font-display text-2xl text-navy">Pipeline overview</h1>
          </div>
          <div className="text-xs text-muted">As of {new Date().toLocaleDateString()}</div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Kpi
            label="Total pipeline"
            value={formatCurrencyFull(totalPipeline)}
            icon={BarChart3}
          />
          <Kpi
            label="Weighted forecast"
            value={formatCurrencyFull(weighted)}
            icon={Target}
            accent
          />
          <Kpi label="Win rate (30d)" value={`${winRate}%`} icon={TrendingUp} />
          <Kpi label="Avg deal (won)" value={formatCurrencyFull(avgDeal)} icon={Trophy} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 border border-line rounded-md bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Pipeline value by stage
              </div>
              <div className="text-xs text-muted">all deals</div>
            </div>
            <div className="space-y-2.5">
              {STAGES.map((s) => {
                const val = byStage.get(s) ?? 0;
                const pct = (val / maxStageVal) * 100;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-muted">{STAGE_LABEL[s]}</div>
                    <div className="flex-1 h-7 bg-canvas border border-line rounded relative overflow-hidden">
                      <div
                        className={`h-full ${
                          s === "closed_won"
                            ? "bg-emerald"
                            : s === "closed_lost"
                            ? "bg-danger"
                            : "bg-brand"
                        } opacity-90 transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-xs font-medium font-display">
                      {formatCurrencyFull(val)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border border-line rounded-md bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-4">
              Top reps · closed won
            </div>
            <ol className="space-y-3">
              {leaderboard.map((row, i) => (
                <li
                  key={row.user.id}
                  className="flex items-center gap-3 py-1 border-b border-line last:border-0"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-sm ${
                      i === 0
                        ? "bg-brand text-white"
                        : "bg-canvas border border-line text-muted"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{row.user.name}</div>
                    <div className="text-xs text-muted truncate">{row.user.email}</div>
                  </div>
                  <div className="font-display text-base">{formatCurrencyFull(row.won)}</div>
                </li>
              ))}
              {leaderboard.length === 0 && (
                <li className="text-sm text-muted">No closed-won deals yet.</li>
              )}
            </ol>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={`border border-line rounded bg-white shadow-card p-4 ${
        accent ? "ring-1 ring-brand/20 bg-brand-tint/40" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
        <div
          className={`w-7 h-7 rounded flex items-center justify-center ${
            accent ? "bg-brand text-white" : "bg-brand-tint text-brand"
          }`}
        >
          <Icon size={14} />
        </div>
      </div>
      <div className={`font-display text-2xl ${accent ? "text-brand" : "text-navy"}`}>{value}</div>
    </div>
  );
}
