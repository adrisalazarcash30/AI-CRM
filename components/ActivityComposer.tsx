"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { Activity } from "@/types";

interface Props {
  dealId: string;
  onLogged: (a: Activity) => void;
}

type Parsed = {
  type: string;
  summary: string;
  contact_name: string | null;
  next_step: string | null;
  due_date: string | null;
  sentiment: "positive" | "neutral" | "negative";
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-brand",
  neutral: "text-muted",
  negative: "text-danger",
};

export default function ActivityComposer({ dealId, onLogged }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setParsed(null);
    setError(null);
    setText("");
  }, [dealId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    try {
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("pipeline.currentRep") : null;
      const res = await fetch("/api/ai/parse-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, rawText: text, userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed");
      }
      const json = await res.json();
      setParsed(json.parsed);
      onLogged(json.activity);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 py-4 border-t border-line bg-white">
      <form onSubmit={submit} className="relative">
        <Sparkles
          size={14}
          className="absolute left-3 top-3 text-brand pointer-events-none"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Log a call, email, or note in one line…'
          disabled={loading}
          className="w-full border border-line rounded pl-8 pr-24 py-2.5 text-sm bg-canvas focus:outline-none focus:border-ink disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="absolute right-1.5 top-1.5 px-3 py-1.5 text-xs font-medium bg-ink text-canvas rounded disabled:opacity-30 flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          {loading ? "Parsing" : "Log"}
        </button>
      </form>

      {error && (
        <div className="mt-2 text-xs text-danger">Error: {error}</div>
      )}

      {parsed && (
        <div className="mt-3 border border-line rounded p-3 bg-canvas">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted mb-2">
            <Sparkles size={10} className="text-brand" />
            Parsed by Claude
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Field label="Type" value={parsed.type} />
            <Field
              label="Sentiment"
              value={parsed.sentiment}
              className={SENTIMENT_COLOR[parsed.sentiment]}
            />
            <Field label="Contact" value={parsed.contact_name ?? "—"} />
            <Field label="Due" value={parsed.due_date ?? "—"} />
          </div>
          <div className="mt-2 text-xs">
            <span className="text-muted">Summary: </span>
            <span>{parsed.summary}</span>
          </div>
          {parsed.next_step && (
            <div className="mt-1 text-xs">
              <span className="text-muted">Next step: </span>
              <span className="font-medium">{parsed.next_step}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex gap-1.5">
      <span className="text-muted w-16 shrink-0">{label}</span>
      <span className={`font-medium capitalize ${className}`}>{value}</span>
    </div>
  );
}
