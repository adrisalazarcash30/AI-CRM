"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
  Building2,
} from "lucide-react";
import type { Company, Contact, Deal } from "@/types";
import { formatCurrency, initials } from "@/lib/format";

interface Props {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
}

type FormState = {
  id?: string;
  name: string;
  domain: string;
  industry: string;
  size_estimate: string;
};

const EMPTY: FormState = { name: "", domain: "", industry: "", size_estimate: "" };

export default function CompaniesTable({ companies, contacts, deals }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setMode("create");
      setEditing({ ...EMPTY });
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return companies;
    const q = query.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.domain ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q)
    );
  }, [companies, query]);

  const contactsByCo = useMemo(() => {
    const m = new Map<string, number>();
    contacts.forEach((c) => m.set(c.company_id, (m.get(c.company_id) ?? 0) + 1));
    return m;
  }, [contacts]);

  const dealsByCo = useMemo(() => {
    const m = new Map<string, Deal[]>();
    deals.forEach((d) => {
      if (!m.has(d.company_id)) m.set(d.company_id, []);
      m.get(d.company_id)!.push(d);
    });
    return m;
  }, [deals]);

  function openNew() {
    setMode("create");
    setEditing({ ...EMPTY });
  }
  function openEdit(c: Company) {
    setMode("edit");
    setEditing({
      id: c.id,
      name: c.name,
      domain: c.domain ?? "",
      industry: c.industry ?? "",
      size_estimate: c.size_estimate ?? "",
    });
  }
  function close() {
    setEditing(null);
    setSaving(false);
  }

  async function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }

  async function save() {
    if (!editing || !editing.name) return;
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/companies" : `/api/companies/${editing.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          domain: editing.domain || null,
          industry: editing.industry || null,
          size_estimate: editing.size_estimate || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      close();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing?.id) return;
    if (
      !confirm(
        `Delete ${editing.name}? This will also remove its ${
          (dealsByCo.get(editing.id) ?? []).length
        } deal(s) and ${contactsByCo.get(editing.id) ?? 0} contact(s).`
      )
    )
      return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${editing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      close();
      router.refresh();
    } catch {
      alert("Delete failed (likely has linked deals — remove those first)");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, domain, industry…"
            className="w-[300px] bg-white border border-line rounded text-sm pl-8 pr-3 py-1.5 focus:outline-none focus:border-ink"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line rounded bg-white hover:border-ink disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ink text-canvas rounded hover:opacity-90"
          >
            <Plus size={12} />
            New company
          </button>
        </div>
      </div>

      <div className="border border-line rounded-md bg-white overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_0.7fr_0.9fr_60px] gap-4 px-5 py-3 border-b border-line bg-canvas text-[10px] uppercase tracking-[0.18em] text-muted">
          <div>Name</div>
          <div>Domain</div>
          <div>Industry</div>
          <div>Contacts</div>
          <div className="text-right">Open deals</div>
          <div />
        </div>
        <ul>
          {filtered.map((c) => {
            const cDeals = dealsByCo.get(c.id) ?? [];
            const open = cDeals.filter(
              (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
            );
            const openValue = open.reduce((s, d) => s + (d.value_cents ?? 0), 0);
            return (
              <li
                key={c.id}
                className="grid grid-cols-[1.5fr_1fr_1fr_0.7fr_0.9fr_60px] gap-4 items-center px-5 py-3 border-b border-line last:border-0 hover:bg-canvas/60 group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-brand-tint border border-brand/20 text-brand flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {initials(c.name) || <Building2 size={13} />}
                  </div>
                  <div className="font-medium text-sm truncate">{c.name}</div>
                </div>
                <div className="text-sm text-muted truncate">{c.domain ?? "—"}</div>
                <div className="text-sm text-muted truncate">{c.industry ?? "—"}</div>
                <div className="text-sm">{contactsByCo.get(c.id) ?? 0}</div>
                <div className="text-right">
                  {open.length > 0 ? (
                    <>
                      <div className="font-display text-sm">{formatCurrency(openValue)}</div>
                      <div className="text-[11px] text-muted">
                        {open.length} deal{open.length === 1 ? "" : "s"}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-muted opacity-0 group-hover:opacity-100 hover:text-ink transition-opacity"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted">
              No companies match.
            </li>
          )}
        </ul>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/30" onClick={close} />
          <div className="relative bg-white border border-line rounded-md shadow-2xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">
                {mode === "create" ? "New company" : "Edit company"}
              </h3>
              <button onClick={close} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <Field
                label="Name"
                value={editing.name}
                onChange={(v) => setEditing({ ...editing, name: v })}
                placeholder="Acme Corp"
                required
              />
              <Field
                label="Domain"
                value={editing.domain}
                onChange={(v) => setEditing({ ...editing, domain: v })}
                placeholder="acme.com"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Industry"
                  value={editing.industry}
                  onChange={(v) => setEditing({ ...editing, industry: v })}
                  placeholder="B2B SaaS"
                />
                <Field
                  label="Size"
                  value={editing.size_estimate}
                  onChange={(v) => setEditing({ ...editing, size_estimate: v })}
                  placeholder="50-200"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <div>
                {mode === "edit" && (
                  <button
                    onClick={remove}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger border border-line rounded hover:border-danger disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="px-3 py-1.5 text-xs border border-line rounded hover:border-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !editing.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ink text-canvas rounded disabled:opacity-30"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  {mode === "create" ? "Create" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted block mb-1">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-canvas border border-line rounded px-2.5 py-2 text-sm focus:outline-none focus:border-ink"
      />
    </div>
  );
}
