"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Check, X, Sparkles } from "lucide-react";

type Item = {
  deal_id: string;
  deal_name: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

const DONE_KEY = "today.done.v1";
const DONE_DAY_KEY = "today.day.v1";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function TodayFocus() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Reset checked state at midnight
  useEffect(() => {
    try {
      const day = localStorage.getItem(DONE_DAY_KEY);
      if (day !== todayKey()) {
        localStorage.setItem(DONE_DAY_KEY, todayKey());
        localStorage.removeItem(DONE_KEY);
      }
      const raw = localStorage.getItem(DONE_KEY);
      if (raw) setDone(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/at-risk");
      const j = await res.json();
      const raw = (j.items ?? []) as { deal_id: string; reason: string; severity: Item["severity"] }[];
      // Pull names from server snapshot if present
      const snapshot = (j.snapshot ?? []) as { id: string; name: string }[];
      const nameMap = new Map(snapshot.map((s) => [s.id, s.name]));
      setItems(
        raw
          .map((r) => ({
            deal_id: r.deal_id,
            deal_name: nameMap.get(r.deal_id) ?? "Deal",
            reason: r.reason,
            severity: r.severity,
          }))
          .slice(0, 3)
      );
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (open && items.length === 0) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(DONE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }

  const remaining = items.filter((i) => !done.has(i.deal_id)).length;
  const allDone = items.length > 0 && remaining === 0;

  return (
    <div ref={ref} className="fixed bottom-6 left-6 z-[70]">
      {open && (
        <div
          className="absolute bottom-12 left-0 w-[340px] bg-white border border-hairline rounded-md overflow-hidden"
          style={{ boxShadow: "0 12px 32px rgba(10,10,10,0.12)" }}
        >
          <div className="px-4 py-3 border-b border-hairlineFaint flex items-center justify-between">
            <div>
              <div
                className="text-[10px] uppercase text-inkSoft"
                style={{ letterSpacing: "0.08em", fontWeight: 500 }}
              >
                Today’s focus
              </div>
              <div
                className="font-display text-[16px] text-inkDeep mt-0.5"
                style={{ fontWeight: 500 }}
              >
                {allDone
                  ? "All done. Nice."
                  : `${remaining} thing${remaining === 1 ? "" : "s"} to do`}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-inkSoft hover:text-inkDeep"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="max-h-[280px] overflow-y-auto scrollbar-thin">
            {loading && (
              <li className="px-4 py-8 font-display italic text-inkFaint text-center">
                Claude is curating…
              </li>
            )}
            {!loading &&
              items.map((it) => {
                const checked = done.has(it.deal_id);
                return (
                  <li
                    key={it.deal_id}
                    className="px-4 py-3 border-b border-hairlineFaint last:border-0 flex items-start gap-3 group"
                  >
                    <button
                      onClick={() => toggle(it.deal_id)}
                      className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? "bg-forest border-forest text-white"
                          : "border-hairlineDeep hover:border-inkDeep"
                      }`}
                      aria-label="Mark done"
                    >
                      {checked && <Check size={10} strokeWidth={3} />}
                    </button>
                    <button
                      onClick={() => router.push(`/?deal=${it.deal_id}`)}
                      className="flex-1 text-left"
                    >
                      <div
                        className={`text-[13px] ${
                          checked
                            ? "text-inkFaint line-through"
                            : "text-inkDeep"
                        }`}
                      >
                        {it.deal_name}
                      </div>
                      <div className="text-[11px] text-inkSoft mt-0.5">{it.reason}</div>
                    </button>
                  </li>
                );
              })}
            {!loading && items.length === 0 && (
              <li className="px-4 py-8 font-display italic text-inkFaint text-center">
                Pipeline is quiet. Enjoy it.
              </li>
            )}
          </ul>
          <div className="px-4 py-2 bg-paper border-t border-hairlineFaint flex items-center gap-1.5 text-[11px] text-inkSoft">
            <Sparkles size={10} className="text-forest" />
            Curated from Claude’s risk model
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-inkDeep text-white text-[13px] font-medium rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
        style={{ boxShadow: "0 4px 12px rgba(10,10,10,0.12)", fontWeight: 500 }}
      >
        <Target size={14} />
        Today
        {remaining > 0 && !open && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-forest text-white text-[10px] font-semibold">
            {remaining}
          </span>
        )}
      </button>
    </div>
  );
}
