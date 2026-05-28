"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { parseCsv, pickField, type CsvRow } from "@/lib/csv";

type Kind = "contacts" | "activities";

const TEMPLATES: Record<
  Kind,
  { label: string; columns: string[]; sample: string; aliases: Record<string, string[]> }
> = {
  contacts: {
    label: "Contacts",
    columns: ["name", "title", "email", "company"],
    sample:
      "name,title,email,company\nSarah Chen,VP of Sales,sarah@acme.com,Acme Inc\nMarcus Webb,Head of RevOps,marcus@globex.io,Globex",
    aliases: {
      name: ["name", "full name", "contact", "contact name"],
      title: ["title", "role", "position", "job title"],
      email: ["email", "e-mail", "mail"],
      company: ["company", "account", "organization", "org"],
    },
  },
  activities: {
    label: "Activities (Call notes)",
    columns: ["deal", "type", "body", "occurred_at", "contact_name", "user_email"],
    sample:
      "deal,type,body,occurred_at,contact_name,user_email\nAcme Expansion,call,Discussed pricing; champion confirmed budget,2026-05-26,Sarah Chen,sarah.chen@pipeline.io\nGlobex Renewal,email,Sent updated proposal v3,2026-05-27,Marcus Webb,marcus.webb@pipeline.io",
    aliases: {
      deal: ["deal", "opportunity", "deal name"],
      type: ["type", "activity type", "channel"],
      body: ["body", "notes", "note", "summary", "description"],
      occurred_at: ["occurred_at", "date", "when", "datetime", "timestamp"],
      contact_name: ["contact_name", "contact", "with"],
      user_email: ["user_email", "rep", "rep email", "owner", "user"],
    },
  },
};

export default function CsvImporter() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("contacts");
  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | {
    inserted: number;
    skipped: { reason: string }[];
    createdCompanies?: { name: string }[];
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const mapped = useMemo(() => {
    const tmpl = TEMPLATES[kind];
    return rows.map((r) => {
      const out: CsvRow = {};
      for (const col of tmpl.columns) {
        out[col] = pickField(r, tmpl.aliases[col]);
      }
      return out;
    });
  }, [rows, kind]);

  function reset() {
    setFilename(null);
    setRows([]);
    setHeaders([]);
    setResult(null);
    setError(null);
  }

  async function onFile(file: File) {
    reset();
    setFilename(file.name);
    const text = await file.text();
    const { headers: h, rows: rs } = parseCsv(text);
    setHeaders(h);
    setRows(rs);
  }

  async function submit() {
    if (mapped.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mapped }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadTemplate() {
    const tmpl = TEMPLATES[kind];
    const blob = new Blob([tmpl.sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tmpl = TEMPLATES[kind];

  return (
    <div className="space-y-5">
      <div className="border border-line rounded-md bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg">Bulk import</h2>
            <p className="text-sm text-muted mt-0.5">
              Upload a CSV. We'll fuzzy-match company / deal names against existing records.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line rounded bg-white hover:border-ink"
          >
            <Download size={12} />
            Template
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(Object.keys(TEMPLATES) as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => {
                setKind(k);
                reset();
              }}
              className={`px-3 py-1.5 text-sm rounded border ${
                kind === k
                  ? "border-ink bg-ink text-canvas font-medium"
                  : "border-line bg-white hover:border-ink"
              }`}
            >
              {TEMPLATES[k].label}
            </button>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1.5">
          Expected columns
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tmpl.columns.map((c) => (
            <span
              key={c}
              className="text-[11px] font-mono px-2 py-0.5 bg-canvas border border-line rounded"
            >
              {c}
            </span>
          ))}
        </div>

        <label className="block border-2 border-dashed border-line rounded-md p-8 text-center cursor-pointer hover:border-ink transition-colors">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {filename ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <FileText size={16} className="text-emerald" />
              <span className="font-medium">{filename}</span>
              <span className="text-muted">· {rows.length} rows</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  reset();
                }}
                className="ml-2 text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="text-muted">
              <Upload size={20} className="mx-auto mb-2" />
              <div className="text-sm">
                Click to select a CSV file (or drag & drop into the page)
              </div>
              <div className="text-xs mt-1">Up to a few thousand rows</div>
            </div>
          )}
        </label>
      </div>

      {rows.length > 0 && !result && (
        <div className="border border-line rounded-md bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-line">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
                Preview · first 10 of {rows.length}
              </div>
              <div className="text-xs text-muted mt-0.5">
                Detected columns: {headers.join(", ") || "—"}
              </div>
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-ink text-canvas rounded disabled:opacity-30"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Import {rows.length} {tmpl.label.toLowerCase()}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-canvas">
                  {tmpl.columns.map((c) => (
                    <th
                      key={c}
                      className="text-left font-medium uppercase tracking-wider text-[10px] text-muted px-3 py-2 border-b border-line"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapped.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {tmpl.columns.map((c) => (
                      <td
                        key={c}
                        className={`px-3 py-2 ${r[c] ? "text-ink" : "text-muted/60 italic"}`}
                      >
                        {r[c] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-danger/30 bg-danger/5 text-danger rounded-md p-4 text-sm flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="border border-line rounded-md bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald/10 text-emerald flex items-center justify-center">
              <Check size={16} />
            </div>
            <div>
              <div className="font-display text-base">
                Imported {result.inserted} {tmpl.label.toLowerCase()}
              </div>
              <div className="text-xs text-muted">
                {result.skipped.length > 0
                  ? `${result.skipped.length} skipped`
                  : "All rows accepted"}
                {result.createdCompanies && result.createdCompanies.length > 0
                  ? ` · created ${result.createdCompanies.length} new compan${
                      result.createdCompanies.length === 1 ? "y" : "ies"
                    }`
                  : ""}
              </div>
            </div>
          </div>
          {result.skipped.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-muted cursor-pointer">Show skipped rows</summary>
              <ul className="mt-2 text-xs space-y-1">
                {result.skipped.slice(0, 25).map((s, i) => (
                  <li key={i} className="text-muted">
                    • {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs border border-line rounded hover:border-ink"
            >
              Import another file
            </button>
            <a
              href={kind === "contacts" ? "/contacts" : "/"}
              className="px-3 py-1.5 text-xs bg-ink text-canvas rounded"
            >
              View {kind === "contacts" ? "contacts" : "pipeline"}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
