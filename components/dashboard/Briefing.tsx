"use client";

import { useEffect, useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Company, Deal, User } from "@/types";
import { STAGE_LABEL } from "@/types";
import HoverCard from "@/components/ui/HoverCard";
import { formatCurrencyFull, initials } from "@/lib/format";

interface Props {
  deals: Deal[];
  companies: Company[];
  users: User[];
  dismissed: Set<string>;
}

type BriefingData = {
  prose: string;
  chips: { dealId: string; dealName: string; reason: string }[];
};

const CACHE_KEY = "dashboard.briefing.v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default function Briefing({ deals, companies, users, dismissed }: Props) {
  const dealMap = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: BriefingData };
        if (Date.now() - parsed.at < CACHE_TTL) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      }
    } catch {}
    void fetchBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBriefing() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/briefing");
      const j: BriefingData = await res.json();
      setData(j);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ at: Date.now(), data: j })
        );
      } catch {}
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function openDeal(dealId: string) {
    // Navigate to pipeline with deal preselect
    window.location.href = `/?deal=${dealId}`;
  }

  function renderProse(text: string) {
    const parts: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\(#([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const label = m[1];
      const id = m[2];
      const deal = dealMap.get(id);
      const company = deal ? companyMap.get(deal.company_id) : null;
      const owner = deal ? userMap.get(deal.owner_id) : null;
      parts.push(
        <HoverCard
          key={k++}
          title={label}
          subtitle={company?.name ?? undefined}
          initials={initials(company?.name ?? label)}
          href={deal ? `/?deal=${deal.id}` : undefined}
          facts={
            deal
              ? [
                  { label: "Owner", value: owner?.name ?? "—" },
                  {
                    label: "Value",
                    value: (
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrencyFull(deal.value_cents)}
                      </span>
                    ),
                  },
                  { label: "Stage", value: STAGE_LABEL[deal.stage] },
                  {
                    label: "Risk",
                    value: deal.risk ? (
                      <span
                        className={
                          deal.risk === "high"
                            ? "text-[#9F2D2D]"
                            : deal.risk === "medium"
                            ? "text-amberWarn"
                            : "text-forest"
                        }
                      >
                        {deal.risk}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                ]
              : []
          }
          trigger={
            <button
              onClick={() => openDeal(id)}
              className="text-inkDeep hover:text-forest transition-colors"
              style={{
                borderBottom: "1px dashed #C9C6C0",
                paddingBottom: "1px",
              }}
            >
              {label}
            </button>
          }
        />
      );
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  const visibleChips = (data?.chips ?? [])
    .filter((c) => !dismissed.has(c.dealId))
    .filter((c) => deals.some((d) => d.id === c.dealId))
    .slice(0, 3);

  return (
    <section className="bg-white border border-hairline rounded-md p-8">
      <div
        className="text-[11px] uppercase font-semibold text-inkSoft mb-3"
        style={{ letterSpacing: "0.18em" }}
      >
        This week · Updated just now
      </div>
      {loading ? (
        <div
          className="font-display text-[22px] text-inkFaint italic shimmer"
          style={{ lineHeight: 1.4 }}
        >
          Claude is reading your pipeline…
        </div>
      ) : (
        <p
          className="font-display text-[22px] text-inkDeep"
          style={{ lineHeight: 1.4, fontWeight: 400 }}
        >
          {data ? renderProse(data.prose) : "No briefing available."}
        </p>
      )}

      {visibleChips.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {visibleChips.map((chip) => (
            <AttentionChip
              key={chip.dealId}
              dealId={chip.dealId}
              dealName={chip.dealName}
              reason={chip.reason}
              onOpen={() => openDeal(chip.dealId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AttentionChip({
  dealId,
  dealName,
  reason,
  onOpen,
}: {
  dealId: string;
  dealName: string;
  reason: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${dealId}`,
    data: { type: "chip", dealId, dealName },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="cursor-grab active:cursor-grabbing bg-paper border border-hairline rounded-full px-3 py-1.5 text-[12px] flex items-center gap-2 hover:border-inkDeep transition-colors group"
    >
      <span
        onClick={onOpen}
        className="font-medium text-inkDeep group-hover:text-forest cursor-pointer"
        style={{ borderBottom: "1px dashed transparent" }}
      >
        {dealName}
      </span>
      <span className="text-inkSoft">·</span>
      <span className="text-inkSoft">{reason}</span>
    </div>
  );
}
