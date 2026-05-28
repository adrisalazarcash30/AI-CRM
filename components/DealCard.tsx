"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Building2, MoreHorizontal, GripVertical } from "lucide-react";
import type { DealWithRelations } from "@/types";
import { STAGE_LABEL } from "@/types";

interface Props {
  deal: DealWithRelations;
  onOpen: (id: string) => void;
}

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DealCard({ deal, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    boxShadow: isDragging ? "0 8px 24px rgba(10,10,10,0.06)" : undefined,
  };

  const dateLabel = formatDateLong(deal.expected_close ?? deal.stage_changed_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(deal.id)}
      className="group bg-white border border-hairline rounded-md p-3.5 cursor-grab active:cursor-grabbing hover:bg-paperHover hover:border-hairlineDeep hover:-translate-y-px transition-all duration-100 ease-out"
    >
      {/* Top row: $ circle + deal name + ⋯ */}
      <div className="flex items-start gap-2.5">
        <div className="w-4 h-4 rounded-full bg-forest text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold leading-none">
          $
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-inkDeep leading-tight truncate">
            {deal.name}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(deal.id);
          }}
          className="text-inkSoft opacity-0 group-hover:opacity-100 hover:text-inkDeep -m-1 p-1"
          aria-label="Open"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Company row */}
      <div className="flex items-center gap-2 mt-1 pl-[26px]">
        <Building2 size={11} strokeWidth={1.5} className="text-inkSoft shrink-0" />
        <span className="text-[13px] text-inkSoft truncate">
          {deal.company?.name ?? "—"}
        </span>
      </div>

      {/* Stage label */}
      <div
        className="mt-1.5 pl-[26px] text-[11px] font-medium uppercase text-inkSoft"
        style={{ letterSpacing: "0.06em" }}
      >
        {STAGE_LABEL[deal.stage]}
      </div>

      {/* Date */}
      <div
        className="mt-0.5 pl-[26px] text-[12px] text-inkSoft"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {dateLabel}
      </div>

      {/* Divider + footer */}
      <div className="mt-2 pt-2 border-t border-hairlineFaint flex items-center justify-between">
        <GripVertical
          size={12}
          className="text-inkFaint opacity-0 group-hover:opacity-100"
        />
        <RiskDot risk={deal.risk} reason={deal.risk_reason} />
      </div>
    </div>
  );
}

function RiskDot({ risk, reason }: { risk: string | null; reason: string | null }) {
  if (!risk || risk === "low") return <span />;
  if (risk === "medium") {
    return (
      <span
        title={reason ?? "Medium risk"}
        className="w-1.5 h-1.5 rounded-full bg-amberWarn"
      />
    );
  }
  // high
  return (
    <span
      title={reason ?? "High risk"}
      className="w-3 h-3 rounded-full border border-amberWarn flex items-center justify-center"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amberWarn" />
    </span>
  );
}
