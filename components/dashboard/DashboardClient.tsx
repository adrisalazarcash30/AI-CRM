"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Activity, Company, Deal, Stage, User } from "@/types";
import { STAGE_PROBABILITY } from "@/types";
import Briefing from "./Briefing";
import KpiRow from "./KpiRow";
import StageChart from "./StageChart";
import Leaderboard from "./Leaderboard";
import AtRiskTable from "./AtRiskTable";
import DashboardAskBar from "./DashboardAskBar";

interface Props {
  deals: Deal[];
  activities: Activity[];
  users: User[];
  companies: Company[];
}

type DragPayload =
  | { type: "chip"; dealId: string; dealName: string }
  | { type: "owner"; dealId: string; dealName: string; ownerName: string }
  | { type: "row"; dealId: string; dealName: string };

interface ToastState {
  id: number;
  label: string;
  undo: () => void;
}

export default function DashboardClient({
  deals: initialDeals,
  activities,
  users,
  companies,
}: Props) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [dismissedChips, setDismissedChips] = useState<Set<string>>(new Set());
  const [probabilities, setProbabilities] = useState<Record<Stage, number>>({
    ...STAGE_PROBABILITY,
  });
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pulseUserId, setPulseUserId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Auto-clear toast after 8s
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!pulseUserId) return;
    const id = setTimeout(() => setPulseUserId(null), 600);
    return () => clearTimeout(id);
  }, [pulseUserId]);

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  async function reassignDeal(dealId: string, newOwnerId: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.owner_id === newOwnerId) return;
    const prevOwnerId = deal.owner_id;
    const newOwnerName = userMap.get(newOwnerId)?.name ?? "rep";
    const prevOwnerName = userMap.get(prevOwnerId)?.name ?? "previous owner";

    // Optimistic update
    setDeals((curr) =>
      curr.map((d) => (d.id === dealId ? { ...d, owner_id: newOwnerId } : d))
    );
    setPulseUserId(newOwnerId);
    setDismissedChips((s) => new Set(s).add(dealId));

    // Toast with undo
    const toastId = Date.now();
    setToast({
      id: toastId,
      label: `${deal.name} → ${newOwnerName}`,
      undo: () => {
        setDeals((curr) =>
          curr.map((d) => (d.id === dealId ? { ...d, owner_id: prevOwnerId } : d))
        );
        setDismissedChips((s) => {
          const next = new Set(s);
          next.delete(dealId);
          return next;
        });
        setToast(null);
        void fetch(`/api/deals/${dealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner_id: prevOwnerId }),
        });
      },
    });

    // Persist + log activity (best-effort, non-blocking)
    void fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: newOwnerId }),
    });
    void fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deal_id: dealId,
        user_id: newOwnerId,
        type: "note",
        body: `Reassigned from ${prevOwnerName} to ${newOwnerName}`,
        raw_input: `Reassigned from ${prevOwnerName} to ${newOwnerName}`,
      }),
    });
  }

  function snoozeDeal(dealId: string) {
    setDismissedChips((s) => new Set(s).add(dealId));
    const deal = deals.find((d) => d.id === dealId);
    setToast({
      id: Date.now(),
      label: `${deal?.name ?? "Deal"} snoozed for 7 days`,
      undo: () => {
        setDismissedChips((s) => {
          const next = new Set(s);
          next.delete(dealId);
          return next;
        });
        setToast(null);
      },
    });
  }

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    if (data) setDrag(data);
  }

  function onDragEnd(e: DragEndEvent) {
    const payload = e.active.data.current as DragPayload | undefined;
    const overId = e.over?.id?.toString();
    setDrag(null);
    if (!payload || !overId) return;

    if (overId === "dismiss-zone") {
      snoozeDeal(payload.dealId);
      return;
    }
    if (overId.startsWith("rep-")) {
      const userId = overId.slice(4);
      void reassignDeal(payload.dealId, userId);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="space-y-6">
        <Briefing
          deals={deals}
          companies={companies}
          users={users}
          dismissed={dismissedChips}
        />
        <KpiRow
          deals={deals}
          probabilities={probabilities}
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <StageChart
              deals={deals}
              probabilities={probabilities}
              onProbabilityChange={(stage, value) =>
                setProbabilities((p) => ({ ...p, [stage]: value }))
              }
              onReset={() => setProbabilities({ ...STAGE_PROBABILITY })}
            />
          </div>
          <div className="lg:col-span-2">
            <Leaderboard
              deals={deals}
              users={users}
              pulseUserId={pulseUserId}
            />
          </div>
        </div>
        <AtRiskTable
          deals={deals}
          companies={companies}
          users={users}
          activities={activities}
          dismissed={dismissedChips}
        />
        <DashboardAskBar />
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {drag && (
          <div className="pointer-events-none px-3 py-1.5 rounded bg-inkDeep text-white text-xs font-medium shadow-pop">
            {drag.type === "row"
              ? `Reassign ${drag.dealName}`
              : drag.type === "owner"
              ? `${drag.dealName} — owner`
              : drag.dealName}
          </div>
        )}
      </DragOverlay>

      {/* Dismiss zone — visible only while dragging a chip/row */}
      {drag && (
        <DismissZone />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-inkDeep text-white text-[13px] rounded shadow-pop px-4 py-2.5 flex items-center gap-3">
          <span>{toast.label}</span>
          <button
            onClick={toast.undo}
            className="text-forest hover:underline text-[12px]"
          >
            undo
          </button>
        </div>
      )}
    </DndContext>
  );
}

function DismissZone() {
  const { setNodeRef, isOver } = useDismissDroppable();
  return (
    <div
      ref={setNodeRef}
      className={`fixed left-0 top-0 bottom-0 w-24 z-40 border-r-2 border-dashed transition-colors ${
        isOver
          ? "bg-[#9F2D2D]/10 border-[#9F2D2D]"
          : "bg-paper/40 border-hairlineDeep"
      }`}
      style={{ pointerEvents: "auto" }}
    >
      <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[#9F2D2D] writing-vertical">
        Drop to snooze
      </div>
    </div>
  );
}

// inline dynamic import to avoid undefined hook
import { useDroppable } from "@dnd-kit/core";
function useDismissDroppable() {
  return useDroppable({ id: "dismiss-zone" });
}
