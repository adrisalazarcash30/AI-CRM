"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Deal, User } from "@/types";
import { formatCurrencyFull, initials } from "@/lib/format";

interface Props {
  deals: Deal[];
  users: User[];
  pulseUserId: string | null;
}

export default function Leaderboard({ deals, users, pulseUserId }: Props) {
  const rows = useMemo(() => {
    const now = Date.now();
    const thirtyAgo = now - 30 * 86400000;
    const closedWon = deals.filter(
      (d) =>
        d.stage === "closed_won" &&
        new Date(d.stage_changed_at).getTime() >= thirtyAgo
    );
    const totals = new Map<string, number>();
    closedWon.forEach((d) =>
      totals.set(d.owner_id, (totals.get(d.owner_id) ?? 0) + (d.value_cents ?? 0))
    );
    const max = Math.max(...Array.from(totals.values()), 1);
    return users
      .map((u) => ({ user: u, won: totals.get(u.id) ?? 0, max }))
      .sort((a, b) => b.won - a.won);
  }, [deals, users]);

  return (
    <section className="bg-white border border-hairline rounded-md p-6 h-full">
      <div
        className="text-[11px] uppercase text-inkSoft mb-1"
        style={{ letterSpacing: "0.08em", fontWeight: 500 }}
      >
        Top performers · last 30 days
      </div>
      <h2
        className="font-display text-[20px] text-inkDeep mb-5"
        style={{ fontWeight: 500 }}
      >
        Drop a deal on a rep to reassign
      </h2>

      <ul className="space-y-1">
        {rows.map((r, i) => (
          <RepRow
            key={r.user.id}
            rank={i + 1}
            user={r.user}
            won={r.won}
            pct={(r.won / r.max) * 100}
            pulsing={r.user.id === pulseUserId}
          />
        ))}
      </ul>
    </section>
  );
}

function RepRow({
  rank,
  user,
  won,
  pct,
  pulsing,
}: {
  rank: number;
  user: User;
  won: number;
  pct: number;
  pulsing: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `rep-${user.id}` });

  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-4 py-3 px-2 rounded transition-all ${
        isOver
          ? "border-2 border-dashed border-forest bg-forest/5"
          : "border-2 border-transparent"
      } ${pulsing ? "bg-forest/15 animate-pulse" : ""}`}
    >
      <span
        className="font-display text-[24px] text-inkFaint w-8 text-center"
        style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
      >
        {rank}
      </span>
      <span className="w-8 h-8 rounded-full bg-paper border border-hairline text-inkSoft flex items-center justify-center text-[10px] font-semibold shrink-0">
        {initials(user.name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-inkDeep truncate">{user.name}</div>
        <div className="text-[12px] text-inkSoft truncate">{user.email}</div>
        <div className="mt-1 h-[2px] bg-hairlineFaint rounded-full">
          <div
            className="h-full bg-forest rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div
        className="font-display text-[18px] text-forest text-right shrink-0"
        style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
      >
        {formatCurrencyFull(won)}
      </div>
    </li>
  );
}
