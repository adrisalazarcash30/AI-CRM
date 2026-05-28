"use client";

import { useEffect, useState, type RefObject } from "react";
import { Loader2, CornerDownLeft } from "lucide-react";

const PROMPTS = [
  "Which deals slipped this week?",
  "What should I focus on today?",
  "Draft a follow-up to Tidepool",
  "Show me deals over $50k stuck in proposal",
];

export default function AskBar({
  inputRef,
  onPickDeal,
}: {
  inputRef?: RefObject<HTMLInputElement>;
  onPickDeal?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [placeholder, setPlaceholder] = useState(PROMPTS[0]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % PROMPTS.length;
      setPlaceholder(PROMPTS[i]);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      setAnswer(json.answer ?? "No response.");
    } catch {
      setAnswer("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function renderAnswer(text: string) {
    const parts: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\(#([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const label = m[1];
      const id = m[2];
      parts.push(
        <button
          key={k++}
          onClick={() => onPickDeal?.(id)}
          className="text-inkDeep underline underline-offset-2 decoration-inkFaint hover:decoration-inkDeep"
        >
          {label}
        </button>
      );
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  return (
    <div className="max-w-[1600px] mx-auto h-16 px-6 flex items-center">
      <form
        onSubmit={ask}
        className="relative mx-auto w-full max-w-[720px]"
        style={{
          transition: "box-shadow 120ms ease-out",
        }}
      >
        <input
          ref={inputRef ?? undefined}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={loading}
          className={`font-display italic text-[18px] w-full bg-transparent py-2.5 pl-1 pr-20 placeholder:text-inkFaint placeholder:italic focus:outline-none ${
            focused
              ? "border border-inkDeep rounded px-3"
              : "border-0 border-b border-hairline rounded-none"
          }`}
          style={{
            boxShadow: focused ? "0 0 0 3px rgba(10,10,10,0.04)" : "none",
            transition: "all 120ms ease-out",
          }}
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium bg-inkDeep text-white rounded disabled:opacity-30 flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <CornerDownLeft size={12} />}
          {loading ? "Thinking" : "Ask"}
        </button>

        {answer && (
          <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white border border-hairline rounded-md shadow-[0_8px_24px_rgba(10,10,10,0.06)] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-inkSoft font-semibold mb-2">
              Claude
            </div>
            <div className="text-sm leading-relaxed text-inkDeep whitespace-pre-wrap">
              {renderAnswer(answer)}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
