"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  Search,
  Pin,
  RefreshCw,
  ArrowUpDown,
  LayoutGrid,
  Filter,
  BarChart3,
  ChevronDown,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Activity, Company, Contact, DealWithRelations, Stage, User } from "@/types";
import { STAGES, STAGE_LABEL } from "@/types";

function stageLabelFor(s: Stage) {
  return STAGE_LABEL[s];
}
import DealCard from "./DealCard";
import DealDrawer from "./DealDrawer";
import AskBar from "./AskBar";
import StageBar from "./StageBar";
import NewDealModal from "./NewDealModal";
import Dropdown, { type DropdownItem } from "./Dropdown";
import { formatCurrencyFull } from "@/lib/format";

interface Props {
  deals: DealWithRelations[];
  activities: Activity[];
  users: User[];
  contacts: Contact[];
  companies: Company[];
}

function Column({
  stage,
  deals,
  onOpen,
}: {
  stage: Stage;
  deals: DealWithRelations[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + (d.value_cents ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[300px] max-w-[340px] flex-1 rounded transition-colors ${
        isOver ? "outline outline-2 outline-dashed outline-inkDeep" : ""
      }`}
    >
      <div className="h-20 flex items-center justify-center">
        <div
          className="font-display text-2xl text-forest"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatCurrencyFull(total)}
        </div>
      </div>
      <div className="flex-1 px-1 pb-3 space-y-2 overflow-y-auto scrollbar-thin min-h-[220px]">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} onOpen={onOpen} />
        ))}
        {deals.length === 0 && (
          <div className="text-center py-8 font-display italic text-inkFaint text-sm">
            No deals here yet
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  deals: initial,
  activities,
  users,
  contacts,
  companies,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [view, setView] = useState<"all" | "mine" | "open" | "closing">("all");
  const [sortKey, setSortKey] = useState<"value" | "days" | "name" | "close">("value");
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const askRef = useRef<HTMLInputElement>(null);

  // Pinned persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPinned(localStorage.getItem("pipeline.viewPinned") === "1");
    }
  }, []);
  function togglePin() {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem("pipeline.viewPinned", next ? "1" : "0");
  }

  // Open new-deal modal via ?new=deal
  useEffect(() => {
    if (searchParams.get("new") === "deal") {
      setShowNewDeal(true);
      // strip param so reload doesn't reopen
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  function doRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const currentRepId =
    typeof window !== "undefined"
      ? localStorage.getItem("pipeline.currentRep") ?? users[0]?.id
      : users[0]?.id;

  const filtered = useMemo(() => {
    let list = deals;
    // View filters
    if (view === "mine" && currentRepId) {
      list = list.filter((d) => d.owner_id === currentRepId);
    } else if (view === "open") {
      list = list.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
    } else if (view === "closing") {
      list = list.filter((d) => {
        if (!d.expected_close) return false;
        const days =
          (new Date(d.expected_close).getTime() - Date.now()) / 86400000;
        return days >= 0 && days <= 14;
      });
    }
    // Stage filter (multi-select)
    if (stageFilter.size > 0) {
      list = list.filter((d) => stageFilter.has(d.stage));
    }
    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.company?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [deals, view, stageFilter, query, currentRepId]);

  const byStage = useMemo(() => {
    const map = new Map<Stage, DealWithRelations[]>();
    STAGES.forEach((s) => map.set(s, []));
    filtered.forEach((d) => map.get(d.stage)?.push(d));
    const cmp: Record<typeof sortKey, (a: DealWithRelations, b: DealWithRelations) => number> = {
      value: (a, b) => (b.value_cents ?? 0) - (a.value_cents ?? 0),
      days: (a, b) =>
        new Date(a.stage_changed_at).getTime() -
        new Date(b.stage_changed_at).getTime(),
      name: (a, b) => a.name.localeCompare(b.name),
      close: (a, b) =>
        new Date(a.expected_close ?? "9999-12-31").getTime() -
        new Date(b.expected_close ?? "9999-12-31").getTime(),
    };
    map.forEach((arr) => arr.sort(cmp[sortKey]));
    return map;
  }, [filtered, sortKey]);

  const counts = useMemo(() => {
    const obj = {} as Record<Stage, number>;
    STAGES.forEach((s) => (obj[s] = (byStage.get(s) ?? []).length));
    return obj;
  }, [byStage]);

  async function onDragEnd(e: DragEndEvent) {
    const dealId = String(e.active.id);
    const newStage = e.over?.id as Stage | undefined;
    if (!newStage || !STAGES.includes(newStage)) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    const prevStage = deal.stage;
    setDeals((curr) =>
      curr.map((d) =>
        d.id === dealId
          ? { ...d, stage: newStage, stage_changed_at: new Date().toISOString() }
          : d
      )
    );

    try {
      const res = await fetch("/api/deals/stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, stage: newStage, prevStage }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setDeals((curr) =>
        curr.map((d) => (d.id === dealId ? { ...d, stage: prevStage } : d))
      );
    }
  }

  const openDeal = openId ? deals.find((d) => d.id === openId) ?? null : null;
  const dealActivities = openId ? activities.filter((a) => a.deal_id === openId) : [];
  const dealContacts =
    openDeal && openDeal.company_id
      ? contacts.filter((c) => c.company_id === openDeal.company_id)
      : [];

  function focusAsk() {
    askRef.current?.focus();
    askRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="bg-paper min-h-screen">
      {/* Sub-toolbar */}
      <div className="bg-white border-b border-hairline">
        <div className="max-w-[1600px] mx-auto px-6 pt-3 pb-3 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[22px] text-inkDeep leading-none font-medium">
                Pipeline
              </h1>
              <Dropdown
                align="left"
                width={200}
                items={[
                  { kind: "header", label: "Filter view" },
                  {
                    kind: "action",
                    label: "All deals",
                    onClick: () => setView("all"),
                    active: view === "all",
                  },
                  {
                    kind: "action",
                    label: "My deals",
                    onClick: () => setView("mine"),
                    active: view === "mine",
                  },
                  {
                    kind: "action",
                    label: "Open only",
                    onClick: () => setView("open"),
                    active: view === "open",
                  },
                  {
                    kind: "action",
                    label: "Closing in 14 days",
                    onClick: () => setView("closing"),
                    active: view === "closing",
                  },
                ]}
                trigger={
                  <span className="flex items-center gap-1 text-[13px] text-inkDeep hover:text-inkSoft">
                    {view === "all"
                      ? "All deals"
                      : view === "mine"
                      ? "My deals"
                      : view === "open"
                      ? "Open only"
                      : "Closing in 14 days"}
                    <ChevronDown size={13} />
                  </span>
                }
              />
              <button
                onClick={togglePin}
                className={`p-1 ${
                  pinned
                    ? "text-forest"
                    : "text-inkSoft hover:text-inkDeep"
                }`}
                title={pinned ? "Unpin view" : "Pin view"}
              >
                <Pin size={13} fill={pinned ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="mt-1.5 text-[11px] text-inkSoft">
              {filtered.length} deals · Sorted by{" "}
              {sortKey === "value"
                ? "value"
                : sortKey === "days"
                ? "days in stage"
                : sortKey === "name"
                ? "name"
                : "close date"}{" "}
              · Updated just now
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-inkSoft pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deals, companies, contacts…"
                className="w-[240px] bg-white border border-hairline rounded text-[13px] pl-8 pr-3 py-1.5 focus:outline-none focus:border-inkDeep focus:ring-0 placeholder:text-inkSoft"
              />
            </div>
            <div className="flex items-center gap-1 text-inkSoft">
              <Dropdown
                align="right"
                width={220}
                items={[
                  { kind: "header", label: "Columns" },
                  {
                    kind: "link",
                    label: "Kanban (current)",
                    href: "/",
                  },
                  {
                    kind: "link",
                    label: "Stage aging table",
                    href: "/reports",
                  },
                ]}
                trigger={
                  <ToolBtn title="View">
                    <LayoutGrid size={14} />
                  </ToolBtn>
                }
              />
              <button
                onClick={doRefresh}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-paper hover:text-inkDeep"
                title="Refresh"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
              </button>
              <Dropdown
                align="right"
                width={200}
                items={[
                  { kind: "header", label: "Sort by" },
                  {
                    kind: "action",
                    label: "Value (largest first)",
                    onClick: () => setSortKey("value"),
                    active: sortKey === "value",
                  },
                  {
                    kind: "action",
                    label: "Days in stage",
                    onClick: () => setSortKey("days"),
                    active: sortKey === "days",
                  },
                  {
                    kind: "action",
                    label: "Name (A→Z)",
                    onClick: () => setSortKey("name"),
                    active: sortKey === "name",
                  },
                  {
                    kind: "action",
                    label: "Expected close",
                    onClick: () => setSortKey("close"),
                    active: sortKey === "close",
                  },
                ]}
                trigger={
                  <ToolBtn title="Sort">
                    <ArrowUpDown size={14} />
                  </ToolBtn>
                }
              />
              <Dropdown
                align="right"
                width={220}
                items={[
                  { kind: "header", label: "Charts & analytics" },
                  { kind: "link", label: "Pipeline overview", href: "/dashboard" },
                  { kind: "link", label: "Full reports", href: "/reports" },
                ]}
                trigger={
                  <ToolBtn title="Charts">
                    <BarChart3 size={14} />
                  </ToolBtn>
                }
              />
              <Dropdown
                align="right"
                width={240}
                items={[
                  { kind: "header", label: "Filter by stage" },
                  ...STAGES.map(
                    (s): DropdownItem => ({
                      kind: "action",
                      label: stageLabelFor(s),
                      onClick: () =>
                        setStageFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          return next;
                        }),
                      active: stageFilter.has(s),
                    })
                  ),
                  { kind: "divider" },
                  {
                    kind: "action",
                    label: "Clear filters",
                    onClick: () => setStageFilter(new Set()),
                  },
                ]}
                trigger={
                  <ToolBtn title="Filter">
                    <Filter
                      size={14}
                      className={stageFilter.size > 0 ? "text-forest" : ""}
                    />
                  </ToolBtn>
                }
              />
            </div>
            <button
              onClick={focusAsk}
              className="font-display text-[13px] italic text-inkDeep hover:text-forest flex items-center gap-1.5"
            >
              <Sparkles size={12} className="text-forest" />
              Ask Claude →
            </button>
            <button
              onClick={() => setShowNewDeal(true)}
              className="flex items-center gap-1.5 bg-inkDeep text-white text-[13px] font-medium rounded-md px-3 py-1.5 hover:opacity-90"
            >
              <Plus size={13} />
              New deal
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Ask bar strip */}
      <div className="bg-white border-b border-hairline">
        <AskBar inputRef={askRef} onPickDeal={(id) => setOpenId(id)} />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-12">
          {/* Stage chevron bar */}
          <StageBar counts={counts} />

          {/* Columns under the chevrons */}
          <div className="flex gap-3 mt-3 overflow-x-auto scrollbar-thin">
            {STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                deals={byStage.get(stage) ?? []}
                onOpen={setOpenId}
              />
            ))}
          </div>
        </div>
      </DndContext>

      <NewDealModal
        open={showNewDeal}
        onClose={() => setShowNewDeal(false)}
        companies={companies}
        users={users}
      />

      <DealDrawer
        deal={openDeal}
        activities={dealActivities}
        contacts={dealContacts}
        users={users}
        onClose={() => setOpenId(null)}
        onDealUpdate={(updated) =>
          setDeals((curr) =>
            curr.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
          )
        }
      />
    </div>
  );
}

function ToolBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center hover:bg-paper hover:text-inkDeep"
    >
      {children}
    </button>
  );
}
