"use client";

import { useMemo } from "react";
import type { Deal, Stage } from "@/types";
import { formatCurrencyFull } from "@/lib/format";

export default function KpiRow({
  deals,
  probabilities,
}: {
  deals: Deal[];
  probabilities: Record<Stage, number>;
}) {
  const stats = useMemo(() => {
    const now = Date.now();
    const open = deals.filter(
      (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
    );
    const openValue = open.reduce((s, d) => s + (d.value_cents ?? 0), 0);
    const weighted = open.reduce(
      (s, d) => s + (d.value_cents ?? 0) * (probabilities[d.stage] ?? 0),
      0
    );
    const thirtyAgo = now - 30 * 86400000;
    const closed30 = deals.filter(
      (d) =>
        (d.stage === "closed_won" || d.stage === "closed_lost") &&
        new Date(d.stage_changed_at).getTime() >= thirtyAgo
    );
    const won = closed30.filter((d) => d.stage === "closed_won");
    const lost = closed30.filter((d) => d.stage === "closed_lost");
    const winRate = closed30.length
      ? Math.round((won.length / closed30.length) * 100)
      : 0;
    const avgDeal = won.length
      ? won.reduce((s, d) => s + (d.value_cents ?? 0), 0) / won.length
      : 0;
    return { openValue, weighted, winRate, won: won.length, lost: lost.length, avgDeal };
  }, [deals, probabilities]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label="Open pipeline"
        value={formatCurrencyFull(stats.openValue)}
        trend="↑ 8% vs last week"
        href="/"
      />
      <KpiCard
        label="Weighted forecast"
        value={formatCurrencyFull(stats.weighted)}
        trend="probability × value"
        href="/?view=open"
        animate
      />
      <KpiCard
        label="Win rate (30d)"
        value={`${stats.winRate}%`}
        trend={`${stats.won} won · ${stats.lost} lost`}
        href="/?view=closed30"
      />
      <KpiCard
        label="Avg deal size"
        value={formatCurrencyFull(stats.avgDeal)}
        trend="won · last 30 days"
        href="/?view=won30"
      />
    </section>
  );
}

function KpiCard({
  label,
  value,
  trend,
  href,
  animate,
}: {
  label: string;
  value: string;
  trend: string;
  href: string;
  animate?: boolean;
}) {
  return (
    <a
      href={href}
      className="block bg-white border border-hairline rounded-md p-5 hover:bg-paperHover hover:border-hairlineDeep transition-all duration-100 ease-out cursor-pointer"
    >
      <div
        className="text-[11px] uppercase text-inkSoft mb-2"
        style={{ letterSpacing: "0.08em", fontWeight: 500 }}
      >
        {label}
      </div>
      <div
        className="font-display text-[36px] leading-none text-inkDeep"
        style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
      >
        {animate ? (
          <span className="transition-all duration-100 ease-out">{value}</span>
        ) : (
          value
        )}
      </div>
      <div className="mt-2 text-[12px] text-inkSoft">{trend}</div>
    </a>
  );
}
