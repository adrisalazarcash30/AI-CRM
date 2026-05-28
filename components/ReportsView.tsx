"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Target,
  TrendingUp,
  Trophy,
  Clock,
  Activity as ActivityIcon,
  Percent,
  Layers,
  Users as UsersIcon,
  Flag,
  Calendar,
} from "lucide-react";
import type { Activity, Deal, Stage, User, Company } from "@/types";
import { STAGES, STAGE_LABEL, STAGE_PROBABILITY } from "@/types";
import { formatCurrencyFull, formatCurrency, initials, daysSince, formatDateShort } from "@/lib/format";

type Period = "all" | "month" | "quarter" | "year";
const AGING_FLAG_DAYS = 30;
const AGING_CRITICAL_DAYS = 100;

interface Props {
  deals: Deal[];
  activities: Activity[];
  users: User[];
  companies: Company[];
}

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-forest",
  email: "bg-emerald/60",
  meeting: "bg-amberWarn",
  demo: "bg-emerald",
  note: "bg-slate-400",
  task: "bg-navy",
};

export default function ReportsView({ deals, activities, users, companies }: Props) {
  const [scope, setScope] = useState<string>("all"); // "all" | user.id
  const [period, setPeriod] = useState<Period>("all");
  const [agingThreshold, setAgingThreshold] = useState<number>(AGING_FLAG_DAYS);

  const periodFilteredDeals = useMemo(() => filterByPeriod(deals, period), [deals, period]);
  const periodFilteredActivities = useMemo(
    () => filterActivitiesByPeriod(activities, period),
    [activities, period]
  );

  const scopedDeals = useMemo(
    () =>
      scope === "all"
        ? periodFilteredDeals
        : periodFilteredDeals.filter((d) => d.owner_id === scope),
    [periodFilteredDeals, scope]
  );
  const scopedActivities = useMemo(
    () =>
      scope === "all"
        ? periodFilteredActivities
        : periodFilteredActivities.filter((a) => a.user_id === scope),
    [periodFilteredActivities, scope]
  );

  const scopeLabel = scope === "all" ? "Team" : users.find((u) => u.id === scope)?.name ?? "Rep";
  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies]
  );
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const kpis = computeKpis(scopedDeals, scopedActivities);
  const stageData = computeStageData(scopedDeals);
  const repTable = computeRepTable(deals, activities, users);
  const activityByType = computeActivityByType(scopedActivities);
  const activityByRep = computeActivityByRep(activities, users);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-forest font-semibold">
            Reports & Analytics
          </div>
          <h1 className="font-display text-2xl text-inkDeep">
            Sales performance · {scopeLabel} · {periodLabel(period)}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-muted" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">Period</span>
            <div className="bg-white border border-line rounded shadow-card p-0.5 inline-flex">
              {(["all", "month", "quarter", "year"] as Period[]).map((p) => (
                <ScopeBtn key={p} active={period === p} onClick={() => setPeriod(p)}>
                  {periodLabel(p)}
                </ScopeBtn>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <UsersIcon size={12} className="text-muted" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">View as</span>
            <div className="bg-white border border-line rounded shadow-card p-0.5 inline-flex">
              <ScopeBtn active={scope === "all"} onClick={() => setScope("all")}>
                Team
              </ScopeBtn>
              {users.map((u) => (
                <ScopeBtn key={u.id} active={scope === u.id} onClick={() => setScope(u.id)}>
                  <span className="w-4 h-4 rounded-full bg-paper text-forest text-[8px] font-semibold flex items-center justify-center">
                    {initials(u.name)}
                  </span>
                  {u.name.split(" ")[0]}
                </ScopeBtn>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Open pipeline"
          value={formatCurrencyFull(kpis.openValue)}
          sub={`${kpis.openCount} deals`}
          icon={BarChart3}
        />
        <Kpi
          label="Weighted forecast"
          value={formatCurrencyFull(kpis.weighted)}
          sub="probability × value"
          icon={Target}
          accent
        />
        <Kpi
          label="Win rate (90d)"
          value={`${kpis.winRate}%`}
          sub={`${kpis.wonCount}W · ${kpis.lostCount}L`}
          icon={Percent}
        />
        <Kpi
          label="Avg deal size"
          value={formatCurrencyFull(kpis.avgDeal)}
          sub="won, last 90d"
          icon={Trophy}
        />
        <Kpi
          label="Avg sales cycle"
          value={`${kpis.avgCycleDays}d`}
          sub="lead → close (won)"
          icon={Clock}
        />
        <Kpi
          label="Pipeline coverage"
          value={`${kpis.coverage.toFixed(1)}×`}
          sub="open / 90d won"
          icon={Layers}
        />
        <Kpi
          label="Activities (30d)"
          value={`${kpis.activities30d}`}
          sub={`${kpis.activitiesPerDeal.toFixed(1)} per deal`}
          icon={ActivityIcon}
        />
        <Kpi
          label="Slip rate"
          value={`${kpis.slipRate}%`}
          sub={`${kpis.stalled} stalled > 14d`}
          icon={TrendingUp}
        />
      </section>

      {/* Pipeline funnel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-line rounded bg-white shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-forest font-semibold">
                Pipeline funnel
              </div>
              <div className="text-sm text-muted">Value by stage · {scopeLabel}</div>
            </div>
            <div className="text-xs text-muted">{scopedDeals.length} deals</div>
          </div>
          <div className="space-y-2.5">
            {stageData.rows.map((r) => (
              <div key={r.stage} className="flex items-center gap-3">
                <div className="w-28 text-xs text-muted">{STAGE_LABEL[r.stage]}</div>
                <div className="flex-1 h-7 bg-canvas border border-line rounded relative overflow-hidden">
                  <div
                    className={`h-full ${r.color} transition-all`}
                    style={{ width: `${(r.value / Math.max(stageData.max, 1)) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[11px] text-white font-medium drop-shadow">
                    {r.count}
                  </span>
                </div>
                <div className="w-28 text-right text-xs font-medium font-display text-inkDeep">
                  {formatCurrency(r.value)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line grid grid-cols-4 gap-3 text-xs">
            <Mini label="Lead → Qual" value={`${stageData.conv.leadQual}%`} />
            <Mini label="Qual → Prop" value={`${stageData.conv.qualProp}%`} />
            <Mini label="Prop → Neg" value={`${stageData.conv.propNeg}%`} />
            <Mini label="Neg → Won" value={`${stageData.conv.negWon}%`} />
          </div>
        </div>

        {/* Activity by type donut-ish */}
        <div className="border border-line rounded bg-white shadow-card p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-forest font-semibold mb-3">
            Activity mix
          </div>
          <div className="text-sm text-muted mb-3">Last 60 days · {scopeLabel}</div>
          <div className="space-y-2">
            {activityByType.map((row) => (
              <div key={row.type} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    ACTIVITY_COLORS[row.type] ?? "bg-line"
                  }`}
                />
                <span className="text-xs capitalize flex-1">{row.type}</span>
                <span className="text-xs text-muted">{row.count}</span>
                <div className="w-20 h-1.5 bg-canvas rounded overflow-hidden">
                  <div
                    className={`h-full ${ACTIVITY_COLORS[row.type] ?? "bg-line"}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {activityByType.length === 0 && (
              <div className="text-xs text-muted italic">No activities in window</div>
            )}
          </div>
        </div>
      </section>

      {/* Comparative reps table */}
      <section className="border border-line rounded bg-white shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-forest font-semibold">
              Sales rep comparison
            </div>
            <div className="text-sm text-muted">Side-by-side performance · last 90 days</div>
          </div>
          <div className="text-xs text-muted">{users.length} reps</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-canvas">
            <tr className="text-[10px] uppercase tracking-wider text-muted">
              <th className="text-left px-5 py-2.5 font-medium">Rep</th>
              <th className="text-right px-3 py-2.5 font-medium">Open pipeline</th>
              <th className="text-right px-3 py-2.5 font-medium">Weighted</th>
              <th className="text-right px-3 py-2.5 font-medium">Won (90d)</th>
              <th className="text-right px-3 py-2.5 font-medium">Win %</th>
              <th className="text-right px-3 py-2.5 font-medium">Avg cycle</th>
              <th className="text-right px-3 py-2.5 font-medium">Avg deal</th>
              <th className="text-right px-5 py-2.5 font-medium">Activities (30d)</th>
            </tr>
          </thead>
          <tbody>
            {repTable.map((r) => (
              <tr
                key={r.user.id}
                className={`border-t border-line hover:bg-canvas/60 cursor-pointer ${
                  scope === r.user.id ? "bg-forest/5" : ""
                }`}
                onClick={() => setScope(r.user.id)}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-paper border border-hairline text-inkSoft flex items-center justify-center text-[10px] font-semibold">
                      {initials(r.user.name)}
                    </div>
                    <div>
                      <div className="font-medium text-ink">{r.user.name}</div>
                      <div className="text-[11px] text-muted">{r.user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right px-3 py-3 font-display">{formatCurrency(r.openValue)}</td>
                <td className="text-right px-3 py-3 font-display text-forest">
                  {formatCurrency(r.weighted)}
                </td>
                <td className="text-right px-3 py-3 font-display text-emerald">
                  {formatCurrency(r.wonValue)}
                </td>
                <td className="text-right px-3 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      r.winRate >= 50
                        ? "bg-emerald/10 text-emerald"
                        : r.winRate >= 25
                        ? "bg-amberWarn/10 text-warn"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {r.winRate}%
                  </span>
                </td>
                <td className="text-right px-3 py-3 text-muted">{r.avgCycleDays}d</td>
                <td className="text-right px-3 py-3 text-muted">{formatCurrency(r.avgDeal)}</td>
                <td className="text-right px-5 py-3">{r.activities30d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Stage aging — flagged deals */}
      <section className="border border-line rounded bg-white shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-forest font-semibold flex items-center gap-1.5">
              <Flag size={11} />
              Stage aging
            </div>
            <div className="text-sm text-muted">
              How long each open deal has sat in its current stage
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Flag if &gt;</span>
            <input
              type="number"
              min={1}
              value={agingThreshold}
              onChange={(e) => setAgingThreshold(Math.max(1, parseInt(e.target.value || "0", 10)))}
              className="w-16 bg-canvas border border-line rounded px-2 py-1 text-sm focus:outline-none focus:border-inkDeep"
            />
            <span className="text-muted">days</span>
            <span className="ml-3 text-muted">·</span>
            <span className="flex items-center gap-1 text-muted">
              <span className="w-2 h-2 rounded-full bg-amberWarn" /> warn
            </span>
            <span className="flex items-center gap-1 text-muted">
              <span className="w-2 h-2 rounded-full bg-danger" /> critical &gt; {AGING_CRITICAL_DAYS}d
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="text-left px-5 py-2.5 font-medium">Deal</th>
                <th className="text-left px-3 py-2.5 font-medium">Company</th>
                <th className="text-left px-3 py-2.5 font-medium">Owner</th>
                <th className="text-left px-3 py-2.5 font-medium">Stage</th>
                <th className="text-right px-3 py-2.5 font-medium">Days in stage</th>
                <th className="text-right px-3 py-2.5 font-medium">Total age</th>
                <th className="text-right px-3 py-2.5 font-medium">Value</th>
                <th className="text-right px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {computeAging(scopedDeals, agingThreshold).map((row) => {
                const company = companyMap.get(row.deal.company_id);
                const owner = userMap.get(row.deal.owner_id);
                return (
                  <tr
                    key={row.deal.id}
                    className="border-t border-line hover:bg-canvas/60"
                  >
                    <td className="px-5 py-2.5 font-medium text-ink truncate max-w-[220px]">
                      {row.deal.name}
                    </td>
                    <td className="px-3 py-2.5 text-muted truncate max-w-[160px]">
                      {company?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-paper border border-hairline text-inkSoft text-[9px] font-semibold flex items-center justify-center">
                          {initials(owner?.name)}
                        </span>
                        <span className="text-xs truncate">{owner?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-canvas border border-line">
                        {STAGE_LABEL[row.deal.stage]}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5">
                      <span
                        className={`font-display font-medium ${
                          row.severity === "critical"
                            ? "text-danger"
                            : row.severity === "warn"
                            ? "text-warn"
                            : "text-ink"
                        }`}
                      >
                        {row.daysInStage}d
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 text-muted">{row.totalAge}d</td>
                    <td className="text-right px-3 py-2.5 font-display">
                      {formatCurrency(row.deal.value_cents)}
                    </td>
                    <td className="text-right px-5 py-2.5">
                      {row.severity === "critical" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-danger/10 text-danger">
                          <Flag size={10} />
                          Critical
                        </span>
                      ) : row.severity === "warn" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amberWarn/10 text-warn">
                          <Flag size={10} />
                          Flagged
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">Healthy</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {scopedDeals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
                .length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center px-5 py-8 text-muted text-sm">
                    No open deals in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Activity per rep */}
      <section className="border border-line rounded bg-white shadow-card p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-forest font-semibold mb-3">
          Activity volume by rep
        </div>
        <div className="text-sm text-muted mb-4">Last 60 days · all activity types</div>
        <div className="space-y-3">
          {activityByRep.map((row) => (
            <div key={row.user.id} className="flex items-center gap-3">
              <div className="w-32 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-paper border border-hairline text-inkSoft flex items-center justify-center text-[9px] font-semibold">
                  {initials(row.user.name)}
                </div>
                <span className="text-sm truncate">{row.user.name}</span>
              </div>
              <div className="flex-1 h-6 bg-canvas border border-line rounded overflow-hidden flex">
                {row.breakdown.map((b) =>
                  b.count === 0 ? null : (
                    <div
                      key={b.type}
                      className={`${ACTIVITY_COLORS[b.type] ?? "bg-line"} h-full`}
                      style={{ width: `${(b.count / Math.max(row.total, 1)) * 100}%` }}
                      title={`${b.type}: ${b.count}`}
                    />
                  )
                )}
              </div>
              <div className="w-12 text-right text-sm font-medium">{row.total}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          {Object.keys(ACTIVITY_COLORS).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${ACTIVITY_COLORS[t]}`} />
              <span className="capitalize text-muted">{t}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScopeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
        active ? "bg-inkDeep text-white" : "text-ink hover:bg-canvas"
      }`}
    >
      {children}
    </button>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={`border border-line rounded bg-white shadow-card p-4 ${
        accent ? "ring-1 ring-forest/20 bg-forest/5" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
        <div
          className={`w-7 h-7 rounded flex items-center justify-center ${
            accent ? "bg-inkDeep text-white" : "bg-paper text-forest"
          }`}
        >
          <Icon size={14} />
        </div>
      </div>
      <div className={`font-display text-xl ${accent ? "text-forest" : "text-inkDeep"}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display text-base text-inkDeep">{value}</div>
    </div>
  );
}

// --- Computations ---

function periodLabel(p: Period): string {
  switch (p) {
    case "month":
      return "This month";
    case "quarter":
      return "This quarter";
    case "year":
      return "This year";
    default:
      return "All time";
  }
}

function periodStart(p: Period): number | null {
  if (p === "all") return null;
  const now = new Date();
  if (p === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  if (p === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1).getTime();
  }
  if (p === "year") {
    return new Date(now.getFullYear(), 0, 1).getTime();
  }
  return null;
}

function filterByPeriod(deals: Deal[], p: Period): Deal[] {
  const start = periodStart(p);
  if (start === null) return deals;
  return deals.filter((d) => new Date(d.created_at).getTime() >= start);
}

function filterActivitiesByPeriod(activities: Activity[], p: Period): Activity[] {
  const start = periodStart(p);
  if (start === null) return activities;
  return activities.filter((a) => new Date(a.occurred_at).getTime() >= start);
}

function computeAging(deals: Deal[], threshold: number) {
  const now = Date.now();
  return deals
    .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
    .map((d) => {
      const daysInStage = Math.floor(
        (now - new Date(d.stage_changed_at).getTime()) / 86400000
      );
      const totalAge = Math.floor((now - new Date(d.created_at).getTime()) / 86400000);
      const severity: "ok" | "warn" | "critical" =
        daysInStage >= 100
          ? "critical"
          : daysInStage >= threshold
          ? "warn"
          : "ok";
      return { deal: d, daysInStage, totalAge, severity };
    })
    .sort((a, b) => b.daysInStage - a.daysInStage);
}

function computeKpis(deals: Deal[], activities: Activity[]) {
  const now = Date.now();
  const open = deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const openValue = open.reduce((s, d) => s + (d.value_cents ?? 0), 0);
  const weighted = open.reduce(
    (s, d) => s + (d.value_cents ?? 0) * (STAGE_PROBABILITY[d.stage] ?? 0),
    0
  );

  const ninetyAgo = now - 90 * 86400000;
  const closed90 = deals.filter(
    (d) =>
      (d.stage === "closed_won" || d.stage === "closed_lost") &&
      new Date(d.stage_changed_at).getTime() >= ninetyAgo
  );
  const won = closed90.filter((d) => d.stage === "closed_won");
  const lost = closed90.filter((d) => d.stage === "closed_lost");
  const winRate = closed90.length ? Math.round((won.length / closed90.length) * 100) : 0;
  const wonValue = won.reduce((s, d) => s + (d.value_cents ?? 0), 0);
  const avgDeal = won.length ? wonValue / won.length : 0;

  const cycles = won
    .map((d) => (new Date(d.stage_changed_at).getTime() - new Date(d.created_at).getTime()) / 86400000)
    .filter((n) => n > 0 && n < 365);
  const avgCycleDays = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : 0;

  const coverage = wonValue > 0 ? openValue / wonValue : 0;

  const thirtyAgo = now - 30 * 86400000;
  const activities30d = activities.filter(
    (a) => new Date(a.occurred_at).getTime() >= thirtyAgo
  ).length;
  const activitiesPerDeal = open.length ? activities30d / open.length : 0;

  const stalled = open.filter(
    (d) => (now - new Date(d.stage_changed_at).getTime()) / 86400000 > 14
  ).length;
  const slipRate = open.length ? Math.round((stalled / open.length) * 100) : 0;

  return {
    openValue,
    openCount: open.length,
    weighted,
    winRate,
    wonCount: won.length,
    lostCount: lost.length,
    avgDeal,
    avgCycleDays,
    coverage,
    activities30d,
    activitiesPerDeal,
    stalled,
    slipRate,
  };
}

function computeStageData(deals: Deal[]) {
  const byStage = new Map<Stage, { count: number; value: number }>();
  STAGES.forEach((s) => byStage.set(s, { count: 0, value: 0 }));
  deals.forEach((d) => {
    const cur = byStage.get(d.stage) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += d.value_cents ?? 0;
    byStage.set(d.stage, cur);
  });
  const colorFor = (s: Stage) =>
    s === "closed_won"
      ? "bg-emerald"
      : s === "closed_lost"
      ? "bg-danger"
      : s === "negotiation"
      ? "bg-amberWarn"
      : "bg-forest";
  const rows = STAGES.map((s) => ({
    stage: s,
    count: byStage.get(s)!.count,
    value: byStage.get(s)!.value,
    color: colorFor(s),
  }));
  const max = Math.max(...rows.map((r) => r.value), 1);

  const lead = byStage.get("lead")!.count;
  const qual = byStage.get("qualified")!.count;
  const prop = byStage.get("proposal")!.count;
  const neg = byStage.get("negotiation")!.count;
  const won = byStage.get("closed_won")!.count;

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const conv = {
    leadQual: pct(qual + prop + neg + won, lead + qual + prop + neg + won),
    qualProp: pct(prop + neg + won, qual + prop + neg + won),
    propNeg: pct(neg + won, prop + neg + won),
    negWon: pct(won, neg + won),
  };

  return { rows, max, conv };
}

function computeRepTable(deals: Deal[], activities: Activity[], users: User[]) {
  const now = Date.now();
  const thirtyAgo = now - 30 * 86400000;
  const ninetyAgo = now - 90 * 86400000;

  return users.map((u) => {
    const mine = deals.filter((d) => d.owner_id === u.id);
    const open = mine.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
    const closed90 = mine.filter(
      (d) =>
        (d.stage === "closed_won" || d.stage === "closed_lost") &&
        new Date(d.stage_changed_at).getTime() >= ninetyAgo
    );
    const won = closed90.filter((d) => d.stage === "closed_won");
    const winRate = closed90.length ? Math.round((won.length / closed90.length) * 100) : 0;
    const openValue = open.reduce((s, d) => s + (d.value_cents ?? 0), 0);
    const weighted = open.reduce(
      (s, d) => s + (d.value_cents ?? 0) * (STAGE_PROBABILITY[d.stage] ?? 0),
      0
    );
    const wonValue = won.reduce((s, d) => s + (d.value_cents ?? 0), 0);
    const avgDeal = won.length ? wonValue / won.length : 0;
    const cycles = won
      .map(
        (d) =>
          (new Date(d.stage_changed_at).getTime() - new Date(d.created_at).getTime()) / 86400000
      )
      .filter((n) => n > 0 && n < 365);
    const avgCycleDays = cycles.length
      ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
      : 0;
    const activities30d = activities.filter(
      (a) => a.user_id === u.id && new Date(a.occurred_at).getTime() >= thirtyAgo
    ).length;
    return {
      user: u,
      openValue,
      weighted,
      wonValue,
      winRate,
      avgCycleDays,
      avgDeal,
      activities30d,
    };
  });
}

function computeActivityByType(activities: Activity[]) {
  const sixtyAgo = Date.now() - 60 * 86400000;
  const recent = activities.filter((a) => new Date(a.occurred_at).getTime() >= sixtyAgo);
  const counts = new Map<string, number>();
  recent.forEach((a) => counts.set(a.type, (counts.get(a.type) ?? 0) + 1));
  const total = recent.length;
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

function computeActivityByRep(activities: Activity[], users: User[]) {
  const sixtyAgo = Date.now() - 60 * 86400000;
  const recent = activities.filter((a) => new Date(a.occurred_at).getTime() >= sixtyAgo);
  const types = ["call", "email", "meeting", "demo", "note", "task"];
  return users
    .map((u) => {
      const mine = recent.filter((a) => a.user_id === u.id);
      const breakdown = types.map((t) => ({
        type: t,
        count: mine.filter((a) => a.type === t).length,
      }));
      const total = mine.length;
      return { user: u, breakdown, total };
    })
    .sort((a, b) => b.total - a.total);
}
