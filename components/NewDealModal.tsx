"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import type { Company, Stage, User } from "@/types";
import { STAGES, STAGE_LABEL } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  users: User[];
  defaultOwnerId?: string;
}

export default function NewDealModal({
  open,
  onClose,
  companies,
  users,
  defaultOwnerId,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    company_id: companies[0]?.id ?? "",
    owner_id: defaultOwnerId ?? users[0]?.id ?? "",
    value_dollars: "",
    stage: "lead" as Stage,
    expected_close: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company_id: form.company_id,
          owner_id: form.owner_id,
          value_cents: Math.round(parseFloat(form.value_dollars || "0") * 100),
          stage: form.stage,
          expected_close: form.expected_close || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-inkDeep/40" onClick={onClose} />
      <div
        className="relative bg-white border border-hairline rounded-md w-full max-w-md mx-4 p-5"
        style={{ boxShadow: "0 8px 40px rgba(10,10,10,0.12)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[20px] text-inkDeep">New opportunity</h3>
          <button onClick={onClose} className="text-inkSoft hover:text-inkDeep">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <Field
            label="Deal name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Acme Enterprise Expansion"
            required
          />
          <Select
            label="Company"
            value={form.company_id}
            onChange={(v) => setForm({ ...form, company_id: v })}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Value ($)"
              value={form.value_dollars}
              onChange={(v) => setForm({ ...form, value_dollars: v.replace(/[^0-9.]/g, "") })}
              placeholder="50000"
            />
            <Select
              label="Stage"
              value={form.stage}
              onChange={(v) => setForm({ ...form, stage: v as Stage })}
              options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Owner"
              value={form.owner_id}
              onChange={(v) => setForm({ ...form, owner_id: v })}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
            <Field
              label="Expected close"
              type="date"
              value={form.expected_close}
              onChange={(v) => setForm({ ...form, expected_close: v })}
            />
          </div>
        </div>
        {error && (
          <div className="mt-3 text-xs text-amberWarn">Error: {error}</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-hairline rounded hover:border-inkDeep"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.name || !form.company_id || !form.owner_id}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-inkDeep text-white rounded disabled:opacity-30"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Create deal
          </button>
        </div>
      </div>
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
      <label
        className="block text-[10px] uppercase font-semibold text-inkSoft mb-1"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
        {required && <span className="text-amberWarn ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-paper border border-hairline rounded px-2.5 py-2 text-sm focus:outline-none focus:border-inkDeep"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        className="block text-[10px] uppercase font-semibold text-inkSoft mb-1"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-paper border border-hairline rounded px-2.5 py-2 text-sm focus:outline-none focus:border-inkDeep"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
