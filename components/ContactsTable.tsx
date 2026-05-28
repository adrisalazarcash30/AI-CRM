"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Building2,
  Briefcase,
  Plus,
  RefreshCw,
  X,
  Loader2,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import type { Company, Contact, Deal } from "@/types";
import { formatCurrency, initials } from "@/lib/format";

interface Props {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
}

type FormState = {
  id?: string;
  name: string;
  title: string;
  email: string;
  company_id: string;
};

const EMPTY: FormState = { name: "", title: "", email: "", company_id: "" };

export default function ContactsTable({ contacts, companies, deals }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const companyMap = new Map<string, Company>(companies.map((c) => [c.id, c]));

  // Auto-open create modal when arriving via ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setMode("create");
      setEditing({ ...EMPTY, company_id: companies[0]?.id ?? "" });
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter((c) => {
      const company = companyMap.get(c.company_id);
      return (
        c.name.toLowerCase().includes(q) ||
        (c.title ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (company?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, query, companyMap]);
  const dealsByCompany = new Map<string, Deal[]>();
  deals.forEach((d) => {
    if (!dealsByCompany.has(d.company_id)) dealsByCompany.set(d.company_id, []);
    dealsByCompany.get(d.company_id)!.push(d);
  });

  function openNew() {
    setMode("create");
    setEditing({ ...EMPTY, company_id: companies[0]?.id ?? "" });
  }
  function openEdit(c: Contact) {
    setMode("edit");
    setEditing({
      id: c.id,
      name: c.name,
      title: c.title ?? "",
      email: c.email ?? "",
      company_id: c.company_id,
    });
  }
  function close() {
    setEditing(null);
    setSaving(false);
    setDeleting(false);
  }

  async function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }

  async function save() {
    if (!editing || !editing.name || !editing.company_id) return;
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/contacts" : `/api/contacts/${editing.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          title: editing.title || null,
          email: editing.email || null,
          company_id: editing.company_id,
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
    if (!confirm(`Delete ${editing.name}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${editing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      close();
      router.refresh();
    } catch {
      alert("Delete failed");
      setDeleting(false);
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
            placeholder="Search contacts, title, email, company…"
            className="w-[320px] bg-white border border-line rounded text-sm pl-8 pr-3 py-1.5 focus:outline-none focus:border-ink"
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
          New contact
        </button>
        </div>
      </div>

      <div className="border border-line rounded-md bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_0.7fr_60px] gap-4 px-5 py-3 border-b border-line bg-canvas text-[10px] uppercase tracking-[0.18em] text-muted">
          <div>Name</div>
          <div>Title</div>
          <div>Email</div>
          <div>Company</div>
          <div className="text-right">Open deals</div>
          <div />
        </div>

        <ul>
          {filtered.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted">
              No contacts match.
            </li>
          )}
          {filtered.map((c) => {
            const company = companyMap.get(c.company_id);
            const companyDeals = dealsByCompany.get(c.company_id) ?? [];
            const openDeals = companyDeals.filter(
              (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
            );
            const openValue = openDeals.reduce((s, d) => s + (d.value_cents ?? 0), 0);
            return (
              <li
                key={c.id}
                className="grid grid-cols-[1fr_1fr_1.5fr_1fr_0.7fr_60px] gap-4 items-center px-5 py-3 border-b border-line last:border-0 hover:bg-canvas/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-tint border border-brand/20 text-brand flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="font-medium text-sm truncate">{c.name}</div>
                </div>
                <div className="text-sm text-muted flex items-center gap-1.5 min-w-0">
                  <Briefcase size={12} className="text-muted/70 shrink-0" />
                  <span className="truncate">{c.title ?? "—"}</span>
                </div>
                <div className="text-sm min-w-0">
                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-brand hover:underline flex items-center gap-1.5 min-w-0"
                    >
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded bg-brand-tint border border-brand/15 text-brand flex items-center justify-center text-[9px] font-semibold shrink-0">
                    {initials(company?.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{company?.name ?? "—"}</div>
                    {company?.industry && (
                      <div className="text-[11px] text-muted truncate">{company.industry}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {openDeals.length > 0 ? (
                    <>
                      <div className="font-display text-sm">{formatCurrency(openValue)}</div>
                      <div className="text-[11px] text-muted">
                        {openDeals.length} deal{openDeals.length === 1 ? "" : "s"}
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
        </ul>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/30" onClick={close} />
          <div className="relative bg-white border border-line rounded-md shadow-2xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">
                {mode === "create" ? "New contact" : "Edit contact"}
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
                placeholder="Sarah Chen"
                required
              />
              <Field
                label="Title"
                value={editing.title}
                onChange={(v) => setEditing({ ...editing, title: v })}
                placeholder="VP of Sales"
              />
              <Field
                label="Email"
                type="email"
                value={editing.email}
                onChange={(v) => setEditing({ ...editing, email: v })}
                placeholder="sarah@acme.com"
              />
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted block mb-1">
                  Company
                </label>
                <select
                  value={editing.company_id}
                  onChange={(e) => setEditing({ ...editing, company_id: e.target.value })}
                  className="w-full bg-canvas border border-line rounded px-2.5 py-2 text-sm focus:outline-none focus:border-ink"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <div>
                {mode === "edit" && (
                  <button
                    onClick={remove}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger border border-line rounded hover:border-danger disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
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
                  disabled={saving || !editing.name || !editing.company_id}
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
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted block mb-1">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-canvas border border-line rounded px-2.5 py-2 text-sm focus:outline-none focus:border-ink"
      />
    </div>
  );
}
