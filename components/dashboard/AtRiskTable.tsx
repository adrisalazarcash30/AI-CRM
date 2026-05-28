"use client";

import { useEffect, useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Activity, Company, Deal, User } from "@/types";
import { STAGE_LABEL } from "@/types";
import { formatCurrencyFull, initials } from "@/lib/format";
import { Send } from "lucide-react";

interface Props {
  deals: Deal[];
  companies: Company[];
  users: User[];
  activities: Activity[];
  dismissed: Set<string>;
}

type RankedItem = { deal_id: string; reason: string; severity: "low" | "medium" | "high" };

const CACHE_KEY = "dashboard.atRisk.v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const SEV_COLOR: Record<string, string> = {
  high: "bg-[#9F2D2D]",
  medium: "bg-amberWarn",
  low: "bg-forest",
};

export default function AtRiskTable({
  deals,
  companies,
  users,
  activities,
  dismissed,
}: Props) {
  const [ranked, setRanked] = useState<RankedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; items: RankedItem[] };
        if (Date.now() - parsed.at < CACHE_TTL) {
          setRanked(parsed.items);
          setLoading(false);
          return;
        }
      }
    } catch {}
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/at-risk");
      const j = await res.json();
      setRanked(j.items ?? []);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ at: Date.now(), items: j.items ?? [] })
        );
      } catch {}
    } catch {}
    setLoading(false);
  }

  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies]
  );
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const lastActivityMap = useMemo(() => {
    const m = new Map<string, string>();
    activities.forEach((a) => {
      const cur = m.get(a.deal_id);
      if (!cur || new Date(a.occurred_at) > new Date(cur)) {
        m.set(a.deal_id, a.occurred_at);
      }
    });
    return m;
  }, [activities]);

  const rows = ranked
    .filter((r) => !dismissed.has(r.deal_id))
    .map((r) => {
      const deal = deals.find((d) => d.id === r.deal_id);
      if (!deal) return null;
      const last = lastActivityMap.get(deal.id);
      const stale = last
        ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
        : null;
      return {
        deal,
        reason: r.reason,
        severity: r.severity,
        stale,
        company: companyMap.get(deal.company_id),
        owner: userMap.get(deal.owner_id),
      };
    })
    .filter(<T,>(x: T | null): x is T => !!x)
    .slice(0, 5);

  return (
    <section className="bg-white border border-hairline rounded-md">
      <div className="px-6 pt-6 pb-3">
        <div
          className="text-[11px] uppercase text-inkSoft mb-1"
          style={{ letterSpacing: "0.08em", fontWeight: 500 }}
        >
          Needs your attention
        </div>
        <h2
          className="font-display text-[20px] text-inkDeep"
          style={{ fontWeight: 500 }}
        >
          Claude ranked these as highest-risk
        </h2>
      </div>
      {loading ? (
        <div className="px-6 py-8 font-display italic text-[14px] text-inkFaint">
          Reading recent activity…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-8 font-display italic text-[14px] text-inkFaint">
          Nothing flagged. Pipeline is healthy.
        </div>
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-[10px] uppercase text-inkSoft border-y border-hairlineFaint">
              <th
                className="text-left px-6 py-2.5 font-medium"
                style={{ letterSpacing: "0.08em" }}
              >
                Deal
              </th>
              <th
                className="text-left px-3 py-2.5 font-medium"
                style={{ letterSpacing: "0.08em" }}
              >
                Owner
              </th>
              <th
                className="text-right px-3 py-2.5 font-medium"
                style={{ letterSpacing: "0.08em" }}
              >
                Value
              </th>
              <th
                className="text-right px-3 py-2.5 font-medium"
                style={{ letterSpacing: "0.08em" }}
              >
                Stale
              </th>
              <th
                className="text-left px-3 py-2.5 font-medium"
                style={{ letterSpacing: "0.08em" }}
              >
                Risk
              </th>
              <th className="px-6 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.deal.id} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

type RowData = {
  deal: Deal;
  reason: string;
  severity: "low" | "medium" | "high";
  stale: number | null;
  company: Company | undefined;
  owner: User | undefined;
};

function Row({ row }: { row: RowData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `risk-row-${row.deal.id}`,
    data: { type: "row", dealId: row.deal.id, dealName: row.deal.name },
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="group border-b border-hairlineFaint last:border-0 hover:bg-paperHover transition-colors"
    >
      <td className="px-6 py-3 align-middle">
        <button
          onClick={() => (window.location.href = `/?deal=${row.deal.id}`)}
          className="font-display text-[15px] text-inkDeep hover:text-forest text-left cursor-pointer"
          style={{
            borderBottom: "1px dashed transparent",
            fontWeight: 500,
          }}
        >
          {row.deal.name}
        </button>
        <div className="text-[12px] text-inkSoft mt-0.5">
          {row.company?.name ?? "—"} · {STAGE_LABEL[row.deal.stage]}
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <div
          {...attributes}
          {...listeners}
          className="inline-flex items-center gap-2 px-2 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-paper"
        >
          <span className="w-6 h-6 rounded-full bg-paper border border-hairline text-inkSoft flex items-center justify-center text-[9px] font-semibold">
            {initials(row.owner?.name)}
          </span>
          <span className="text-[13px] text-inkDeep">
            {row.owner?.name?.split(" ")[0] ?? "—"}
          </span>
        </div>
      </td>
      <td
        className="text-right px-3 py-3 align-middle font-display text-[14px] text-inkDeep"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatCurrencyFull(row.deal.value_cents)}
      </td>
      <td
        className={`text-right px-3 py-3 align-middle text-[13px] ${
          (row.stale ?? 0) > 10 ? "text-[#9F2D2D]" : "text-inkSoft"
        }`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {row.stale != null ? `${row.stale}d` : "—"}
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2" title={row.reason}>
          <span className={`w-2 h-2 rounded-full ${SEV_COLOR[row.severity]}`} />
          <span className="text-[12px] text-inkSoft truncate max-w-[220px]">
            {row.reason}
          </span>
        </div>
      </td>
      <td className="px-6 py-3 align-middle text-right">
        <button
          onClick={() => (window.location.href = `/?deal=${row.deal.id}&compose=1`)}
          className="text-[12px] text-forest opacity-0 group-hover:opacity-100 transition-opacity hover:underline inline-flex items-center gap-1"
        >
          <Send size={11} />
          Draft outreach →
        </button>
      </td>
    </tr>
  );
}
