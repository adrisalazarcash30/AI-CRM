"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2, RefreshCw, Mail, Users as UsersIcon, Pencil, Send } from "lucide-react";
import EmailDraftModal from "./EmailDraftModal";
import type { Activity, Contact, Deal, DealWithRelations, User } from "@/types";
import { STAGE_LABEL } from "@/types";
import { formatCurrencyFull, daysSince, formatDateShort, initials } from "@/lib/format";
import ActivityComposer from "./ActivityComposer";

interface Props {
  deal: DealWithRelations | null;
  activities: Activity[];
  contacts: Contact[];
  users: User[];
  onClose: () => void;
  onDealUpdate?: (deal: Deal) => void;
}

const RISK_TEXT: Record<string, string> = {
  high: "text-danger",
  medium: "text-warn",
  low: "text-emerald",
};

export default function DealDrawer({ deal, activities, contacts, users, onClose, onDealUpdate }: Props) {
  const [local, setLocal] = useState<Activity[]>(activities);
  const [d, setD] = useState<DealWithRelations | null>(deal);
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({
    name: "",
    value_dollars: "",
    created_at: "",
    expected_close: "",
  });
  const [saving, setSaving] = useState(false);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    setLocal(activities);
    setD(deal);
  }, [activities, deal]);

  if (!d) return null;

  const userMap = new Map(users.map((u) => [u.id, u]));

  async function refreshAI() {
    if (!d || aiLoading) return;
    setAiLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch("/api/ai/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId: d.id }),
        }).then((r) => r.json()),
        fetch("/api/ai/risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId: d.id }),
        }).then((r) => r.json()),
      ]);

      const merged = {
        ...d,
        ai_summary: sRes.summary ?? d.ai_summary,
        next_action: sRes.next_action ?? d.next_action,
        risk: rRes.risk ?? d.risk,
        risk_reason: rRes.reason ?? d.risk_reason,
      };
      setD(merged);
      onDealUpdate?.(merged);
    } catch {
      // swallow
    } finally {
      setAiLoading(false);
    }
  }

  function openEdit() {
    if (!d) return;
    setEdit({
      name: d.name,
      value_dollars: ((d.value_cents ?? 0) / 100).toFixed(0),
      created_at: d.created_at?.slice(0, 10) ?? "",
      expected_close: d.expected_close ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!d) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        name: edit.name,
        value_cents: Math.round(parseFloat(edit.value_dollars || "0") * 100),
      };
      if (edit.created_at) patch.created_at = new Date(edit.created_at).toISOString();
      patch.expected_close = edit.expected_close || null;
      const res = await fetch(`/api/deals/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const j = await res.json();
      const merged = { ...d, ...j.deal };
      setD(merged);
      onDealUpdate?.(merged);
      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleLogged(a: Activity) {
    setLocal((curr) => [a, ...curr]);
    // Fire-and-forget AI refresh after a new activity
    void refreshAI();
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/20 z-40" onClick={onClose} aria-hidden />
      <aside
        className="fixed top-0 right-0 h-full w-[480px] max-w-full bg-white border-l border-hairline z-50 flex flex-col"
        style={{ boxShadow: "0 0 60px rgba(0,0,0,0.08)" }}
        role="dialog"
      >
        <div className="px-5 py-5 border-b border-hairline bg-paper flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] uppercase font-semibold text-inkSoft mb-1"
              style={{ letterSpacing: "0.18em" }}
            >
              Opportunity
            </div>
            <h2 className="font-display text-[24px] leading-tight text-inkDeep">
              {d.name}
            </h2>
            <div className="text-[13px] text-inkSoft mt-0.5">
              {d.company?.name}
              {d.company?.industry ? ` · ${d.company.industry}` : ""}
            </div>
            <div
              className="font-display text-[32px] text-forest mt-2 leading-none"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCurrencyFull(d.value_cents)}
            </div>
            <button
              onClick={() => setComposing(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-inkDeep text-white rounded hover:opacity-90"
            >
              <Send size={12} />
              Draft follow-up with Claude
            </button>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={openEdit}
              className="p-1.5 text-inkSoft hover:text-inkDeep"
              aria-label="Edit deal"
              title="Edit deal"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-inkSoft hover:text-inkDeep"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-hairline grid grid-cols-3 gap-4">
          <Stat label="Stage" value={STAGE_LABEL[d.stage] ?? d.stage} />
          <Stat label="Days in stage" value={`${daysSince(d.stage_changed_at)}d`} />
          <Stat label="Owner" value={d.owner?.name ?? "—"} />
          <Stat
            label="Expected close"
            value={d.expected_close ? formatDateShort(d.expected_close) : "—"}
          />
          <Stat
            label="Risk"
            value={d.risk ?? "—"}
            className={d.risk ? RISK_TEXT[d.risk] : ""}
          />
          <Stat label="Created" value={formatDateShort(d.created_at)} />
        </div>

        {/* Summary block */}
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center justify-between mb-2">
            <div
              className="text-[10px] uppercase font-semibold text-inkSoft"
              style={{ letterSpacing: "0.18em" }}
            >
              Summary
            </div>
            <button
              onClick={refreshAI}
              disabled={aiLoading}
              className="text-xs text-inkSoft hover:text-inkDeep flex items-center gap-1 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {d.ai_summary ? "Refresh" : "Generate"}
            </button>
          </div>
          {d.ai_summary ? (
            <div className="bg-paper border border-hairline rounded px-3 py-2.5">
              <p className="font-display italic text-[14px] leading-relaxed text-inkDeep">
                {d.ai_summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-inkSoft italic">
              No AI summary yet — click Generate.
            </p>
          )}
        </div>

        {/* Next best action */}
        {d.next_action && (
          <div className="px-5 py-4 border-b border-hairline">
            <div
              className="text-[10px] uppercase font-semibold text-forest mb-1.5"
              style={{ letterSpacing: "0.18em" }}
            >
              What to do next
            </div>
            <div className="border-l-2 border-forest pl-3 py-1">
              <p className="text-[14px] text-inkDeep leading-snug">{d.next_action}</p>
              <button
                onClick={() => setComposing(true)}
                className="mt-2 text-[12px] text-forest hover:underline flex items-center gap-1"
              >
                <Sparkles size={11} />
                Draft email with Claude →
              </button>
            </div>
          </div>
        )}

        {/* Risk reason */}
        {d.risk_reason && (
          <div className="px-5 py-3 border-b border-hairline bg-paper">
            <div
              className="text-[10px] uppercase font-semibold text-amberWarn mb-1"
              style={{ letterSpacing: "0.18em" }}
            >
              Risk · {d.risk}
            </div>
            <p className="text-[13px] text-inkDeep leading-snug">{d.risk_reason}</p>
          </div>
        )}

        {contacts.length > 0 && (
          <div className="px-5 py-4 border-b border-hairline">
            <div
              className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-inkSoft mb-2.5"
              style={{ letterSpacing: "0.18em" }}
            >
              <UsersIcon size={11} />
              Contacts ({contacts.length})
            </div>
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium leading-tight text-inkDeep">
                      {c.name}
                    </div>
                    {c.title && (
                      <div className="text-[12px] text-inkSoft leading-tight">{c.title}</div>
                    )}
                  </div>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-[12px] text-inkSoft hover:text-inkDeep flex items-center gap-1 shrink-0"
                    >
                      <Mail size={11} />
                      <span className="truncate max-w-[180px]">{c.email}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <div
            className="text-[10px] uppercase font-semibold text-inkSoft mb-3"
            style={{ letterSpacing: "0.18em" }}
          >
            Activity timeline
          </div>
          {local.length === 0 && (
            <div className="text-sm text-inkSoft italic">No activity yet.</div>
          )}
          <ol className="relative space-y-4 pl-4">
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-hairline" />
            {local.map((a) => {
              const u = a.user_id ? userMap.get(a.user_id) : null;
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[15px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border border-hairlineDeep" />
                  <div className="flex items-center justify-between text-[11px] text-inkSoft">
                    <span
                      className="uppercase font-medium"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      {a.type}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatDateShort(a.occurred_at)}
                    </span>
                  </div>
                  <div className="text-[13px] mt-0.5 text-inkDeep leading-snug">
                    {a.body || a.raw_input}
                  </div>
                  {u && <div className="text-[11px] text-inkSoft mt-0.5">{u.name}</div>}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sticky composer at bottom */}
        <div className="border-t border-hairline bg-white">
          <ActivityComposer dealId={d.id} onLogged={handleLogged} />
        </div>
      </aside>

      <EmailDraftModal
        open={composing}
        onClose={() => setComposing(false)}
        dealId={d.id}
        dealName={d.name}
        contacts={contacts}
        ownerId={d.owner_id}
      />

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setEditing(false)} />
          <div className="relative bg-white border border-line rounded shadow-pop w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-navy">Edit opportunity</h3>
              <button onClick={() => setEditing(false)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <EditField
                label="Deal name"
                value={edit.name}
                onChange={(v) => setEdit({ ...edit, name: v })}
              />
              <EditField
                label="Value ($)"
                value={edit.value_dollars}
                onChange={(v) => setEdit({ ...edit, value_dollars: v.replace(/[^0-9.]/g, "") })}
              />
              <EditField
                label="Created"
                type="date"
                value={edit.created_at}
                onChange={(v) => setEdit({ ...edit, created_at: v })}
              />
              <EditField
                label="Expected close"
                type="date"
                value={edit.expected_close}
                onChange={(v) => setEdit({ ...edit, expected_close: v })}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs border border-line rounded hover:border-ink"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !edit.name}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand text-white rounded disabled:opacity-30 hover:bg-brand-dark"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-canvas border border-line rounded px-2.5 py-2 text-sm focus:outline-none focus:border-brand"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  display,
  className = "",
  sub,
}: {
  label: string;
  value: string;
  display?: boolean;
  className?: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className={`${display ? "font-display text-lg" : "text-sm"} mt-0.5 capitalize ${className}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted mt-0.5 leading-snug">{sub}</div>}
    </div>
  );
}
