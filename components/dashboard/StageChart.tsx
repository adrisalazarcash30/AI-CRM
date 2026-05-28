"use client";

import { useMemo, useRef } from "react";
import type { Deal, Stage } from "@/types";
import { STAGE_LABEL } from "@/types";
import { formatCurrencyFull } from "@/lib/format";

const OPEN_STAGES: Stage[] = ["lead", "qualified", "proposal", "negotiation"];

export default function StageChart({
  deals,
  probabilities,
  onProbabilityChange,
  onReset,
}: {
  deals: Deal[];
  probabilities: Record<Stage, number>;
  onProbabilityChange: (stage: Stage, value: number) => void;
  onReset: () => void;
}) {
  const rows = useMemo(() => {
    return OPEN_STAGES.map((stage) => {
      const matching = deals.filter((d) => d.stage === stage);
      const value = matching.reduce((s, d) => s + (d.value_cents ?? 0), 0);
      return {
        stage,
        count: matching.length,
        value,
        avg: matching.length ? value / matching.length : 0,
      };
    });
  }, [deals]);

  const maxValue = Math.max(...rows.map((r) => r.value), 1);

  return (
    <section className="bg-white border border-hairline rounded-md p-6 h-full">
      <div className="flex items-baseline justify-between mb-1">
        <div
          className="text-[11px] uppercase text-inkSoft"
          style={{ letterSpacing: "0.08em", fontWeight: 500 }}
        >
          Pipeline by stage
        </div>
      </div>
      <h2
        className="font-display text-[20px] text-inkDeep mb-5"
        style={{ fontWeight: 500 }}
      >
        Where the money lives right now
      </h2>

      <div className="space-y-6">
        {rows.map((r) => (
          <BarRow
            key={r.stage}
            label={STAGE_LABEL[r.stage]}
            stage={r.stage}
            count={r.count}
            value={r.value}
            avg={r.avg}
            probability={probabilities[r.stage] ?? 0}
            widthPct={(r.value / maxValue) * 100}
            onProbabilityChange={(v) => onProbabilityChange(r.stage, v)}
          />
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-hairlineFaint flex items-center justify-between">
        <div
          className="font-display italic text-[12px] text-inkSoft"
          style={{ fontWeight: 400 }}
        >
          Drag any bar's right edge to model a different close rate.
        </div>
        <button
          onClick={onReset}
          className="text-[12px] text-inkSoft hover:text-inkDeep"
          style={{ borderBottom: "1px dashed #C9C6C0" }}
        >
          Reset →
        </button>
      </div>
    </section>
  );
}

function BarRow({
  label,
  stage,
  count,
  value,
  avg,
  probability,
  widthPct,
  onProbabilityChange,
}: {
  label: string;
  stage: Stage;
  count: number;
  value: number;
  avg: number;
  probability: number;
  widthPct: number;
  onProbabilityChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    document.body.style.cursor = "ew-resize";
  }

  function onMove(e: React.PointerEvent) {
    if (!dragging.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = Math.max(0.05, Math.min(0.95, x / rect.width));
    onProbabilityChange(Number(pct.toFixed(2)));
  }

  function endDrag(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.cursor = "";
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  return (
    <div
      className="group"
      title={`${count} deals · avg ${formatCurrencyFull(avg)} · weight ${Math.round(
        probability * 100
      )}%`}
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <a
          href={`/?stage=${stage}`}
          className="text-[12px] text-inkSoft hover:text-inkDeep"
          style={{ letterSpacing: "0.04em", fontWeight: 500 }}
        >
          {label.toUpperCase()}{" "}
          <span className="text-inkFaint ml-1">({count})</span>
        </a>
        <div
          className="font-display text-[14px] text-inkDeep"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatCurrencyFull(value)}
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-2 bg-hairlineFaint rounded-full"
      >
        {/* Filled bar — width based on $value */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-forest rounded-full"
          style={{ width: `${widthPct}%` }}
        />
        {/* Probability marker — vertical line at probability % */}
        <div
          className="absolute -top-1.5 bottom-[-6px] flex items-center"
          style={{ left: `calc(${probability * 100}% - 6px)` }}
        >
          <button
            onPointerDown={startDrag}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="w-3 h-5 rounded-sm bg-inkDeep border border-inkDeep cursor-ew-resize relative group-hover:scale-110 transition-transform"
            style={{ touchAction: "none" }}
            title={`Probability: ${Math.round(probability * 100)}%`}
          >
            <span className="sr-only">Adjust probability</span>
          </button>
        </div>
      </div>
      <div className="mt-1.5 text-[11px] text-inkSoft">
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(probability * 100)}%
        </span>{" "}
        close rate · {count} deals · avg {formatCurrencyFull(avg)}
      </div>
    </div>
  );
}
