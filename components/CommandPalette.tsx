"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  DollarSign,
  User as UserIcon,
  Building2,
  Plus,
  Upload,
  Sparkles,
  CornerDownLeft,
  BarChart3,
  Command as CommandIcon,
} from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import { STAGE_LABEL } from "@/types";

type SearchResults = {
  deals: { id: string; name: string; value_cents: number; stage: string; company_name: string | null }[];
  contacts: { id: string; name: string; email: string | null; title: string | null; company_name: string | null }[];
  companies: { id: string; name: string; domain: string | null; industry: string | null }[];
};

type Item =
  | { kind: "action"; id: string; label: string; sub?: string; icon: React.ReactNode; action: () => void }
  | { kind: "deal"; id: string; label: string; sub?: string }
  | { kind: "contact"; id: string; label: string; sub?: string }
  | { kind: "company"; id: string; label: string; sub?: string };

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setSelected(0);
    } else {
      setQ("");
    }
  }, [open]);

  // Fetch on q change (debounced)
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const j = (await res.json()) as SearchResults;
        setResults(j);
      } catch {
        // ignore
      }
    }, 120);
    return () => clearTimeout(id);
  }, [q, open]);

  const actions: Item[] = useMemo(
    () => [
      {
        kind: "action",
        id: "new-deal",
        label: "Create new deal",
        sub: "Opens a new opportunity form",
        icon: <DollarSign size={14} />,
        action: () => router.push("/?new=deal"),
      },
      {
        kind: "action",
        id: "new-contact",
        label: "Create new contact",
        sub: "Add a person to a company",
        icon: <UserIcon size={14} />,
        action: () => router.push("/contacts?new=1"),
      },
      {
        kind: "action",
        id: "new-company",
        label: "Create new company",
        sub: "Add a new account",
        icon: <Building2 size={14} />,
        action: () => router.push("/companies?new=1"),
      },
      {
        kind: "action",
        id: "import",
        label: "Import CSV",
        sub: "Bulk upload contacts or activities",
        icon: <Upload size={14} />,
        action: () => router.push("/import"),
      },
      {
        kind: "action",
        id: "ask",
        label: "Ask Claude about my pipeline",
        sub: "Natural language query",
        icon: <Sparkles size={14} />,
        action: () => router.push("/dashboard"),
      },
      {
        kind: "action",
        id: "reports",
        label: "Open reports",
        sub: "KPIs, funnel, rep comparison",
        icon: <BarChart3 size={14} />,
        action: () => router.push("/reports"),
      },
    ],
    [router]
  );

  const filteredActions = useMemo(() => {
    if (!q.trim()) return actions;
    const lq = q.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(lq));
  }, [actions, q]);

  const dealItems: Item[] = (results?.deals ?? []).map((d) => ({
    kind: "deal",
    id: d.id,
    label: d.name,
    sub: `${d.company_name ?? "—"} · ${STAGE_LABEL[d.stage as keyof typeof STAGE_LABEL] ?? d.stage} · ${formatCurrencyFull(d.value_cents)}`,
  }));
  const contactItems: Item[] = (results?.contacts ?? []).map((c) => ({
    kind: "contact",
    id: c.id,
    label: c.name,
    sub: `${c.title ? c.title + " · " : ""}${c.company_name ?? c.email ?? ""}`,
  }));
  const companyItems: Item[] = (results?.companies ?? []).map((c) => ({
    kind: "company",
    id: c.id,
    label: c.name,
    sub: c.industry ?? c.domain ?? "",
  }));

  const groups: { title: string; items: Item[]; icon: React.ReactNode }[] = [
    { title: "Actions", items: filteredActions, icon: <CommandIcon size={10} /> },
    { title: "Deals", items: dealItems, icon: <DollarSign size={10} /> },
    { title: "Contacts", items: contactItems, icon: <UserIcon size={10} /> },
    { title: "Companies", items: companyItems, icon: <Building2 size={10} /> },
  ].filter((g) => g.items.length > 0);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const run = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "action") item.action();
      else if (item.kind === "deal") router.push(`/?deal=${item.id}`);
      else if (item.kind === "contact") router.push(`/contacts?q=${encodeURIComponent(item.label)}`);
      else if (item.kind === "company") router.push(`/companies?q=${encodeURIComponent(item.label)}`);
    },
    [router]
  );

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flat[selected];
        if (item) run(item);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, selected, run]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh]">
      <div className="absolute inset-0 bg-inkDeep/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className="relative w-full max-w-[640px] bg-white border border-hairline rounded-md mx-4 overflow-hidden"
        style={{ boxShadow: "0 12px 48px rgba(10,10,10,0.18)" }}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <Search size={16} className="text-inkSoft shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(0);
            }}
            placeholder="Search deals, contacts, companies — or type a command…"
            className="flex-1 bg-transparent text-[15px] focus:outline-none placeholder:text-inkFaint placeholder:italic font-display"
            style={{ fontWeight: 400 }}
          />
          <kbd className="text-[10px] text-inkSoft border border-hairline rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {groups.length === 0 && (
            <div className="px-4 py-10 text-center font-display italic text-inkFaint">
              Nothing matches — try a different word.
            </div>
          )}
          {(() => {
            let runningIdx = 0;
            return groups.map((g, gi) => (
              <div key={gi} className="py-1">
                <div
                  className="px-4 pt-3 pb-1 text-[10px] uppercase text-inkSoft flex items-center gap-1.5"
                  style={{ letterSpacing: "0.08em", fontWeight: 500 }}
                >
                  {g.icon}
                  {g.title}
                </div>
                <ul>
                  {g.items.map((it) => {
                    const idx = runningIdx++;
                    const active = idx === selected;
                    return (
                      <li key={`${it.kind}-${it.id}`}>
                        <button
                          onClick={() => run(it)}
                          onMouseEnter={() => setSelected(idx)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            active ? "bg-paper" : ""
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                              it.kind === "action"
                                ? "bg-forest/10 text-forest"
                                : "bg-paper border border-hairline text-inkSoft"
                            }`}
                          >
                            {it.kind === "action"
                              ? (it as Extract<Item, { kind: "action" }>).icon
                              : it.kind === "deal"
                              ? <DollarSign size={12} />
                              : it.kind === "contact"
                              ? <UserIcon size={12} />
                              : <Building2 size={12} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] text-inkDeep truncate">
                              {it.label}
                            </span>
                            {it.sub && (
                              <span className="block text-[12px] text-inkSoft truncate">
                                {it.sub}
                              </span>
                            )}
                          </span>
                          {active && (
                            <CornerDownLeft size={12} className="text-inkSoft" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ));
          })()}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-hairlineFaint text-[11px] text-inkSoft bg-paper">
          <div className="flex items-center gap-3">
            <kbd className="border border-hairline rounded px-1 py-0.5">↑↓</kbd>
            <span>navigate</span>
            <kbd className="border border-hairline rounded px-1 py-0.5">↵</kbd>
            <span>open</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="border border-hairline rounded px-1 py-0.5">⌘</kbd>
            <kbd className="border border-hairline rounded px-1 py-0.5">K</kbd>
            <span>to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
