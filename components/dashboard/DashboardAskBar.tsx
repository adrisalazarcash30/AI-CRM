"use client";

import { useEffect, useState } from "react";

const PROMPTS = [
  "Why did we lose Tidepool's SMB tier?",
  "Which rep needs coaching?",
  "What changed since last Monday?",
  "Where is my pipeline most fragile?",
];

type SavedNote = { question: string; answer: string };

export default function DashboardAskBar() {
  const [q, setQ] = useState("");
  const [placeholder, setPlaceholder] = useState(PROMPTS[0]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [notes, setNotes] = useState<SavedNote[]>([]);

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
      const j = await res.json();
      setAnswer(j.answer ?? "");
    } catch {
      setAnswer("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function saveNote() {
    if (!answer || !q) return;
    setNotes((prev) => [...prev, { question: q, answer }]);
    setAnswer(null);
    setQ("");
  }

  function render(text: string) {
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
        <a
          key={k++}
          href={`/?deal=${id}`}
          className="text-inkDeep hover:text-forest transition-colors"
          style={{ borderBottom: "1px dashed #C9C6C0" }}
        >
          {label}
        </a>
      );
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  return (
    <section>
      <form onSubmit={ask} className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={loading}
          className="w-full font-display italic text-[17px] bg-transparent py-3 pl-1 pr-3 placeholder:text-inkFaint placeholder:italic focus:outline-none"
          style={{
            borderTop: focused ? "1px solid #0A0A0A" : "none",
            borderLeft: focused ? "1px solid #0A0A0A" : "none",
            borderRight: focused ? "1px solid #0A0A0A" : "none",
            borderBottom: focused ? "1px solid #0A0A0A" : "1px solid #E8E6E1",
            borderRadius: focused ? "4px" : "0",
            paddingLeft: focused ? "12px" : "4px",
            paddingRight: focused ? "12px" : "12px",
            boxShadow: focused ? "0 0 0 3px rgba(10,10,10,0.04)" : "none",
            transition: "all 120ms ease-out",
          }}
        />
      </form>

      {loading && (
        <div className="mt-4 font-display italic text-[15px] text-inkFaint shimmer">
          Claude is thinking…
        </div>
      )}

      {answer && !loading && (
        <div className="mt-4">
          <p
            className="font-display text-[17px] text-inkDeep"
            style={{ lineHeight: 1.5, fontWeight: 400 }}
          >
            {render(answer)}
          </p>
          <button
            onClick={saveNote}
            className="mt-2 text-[12px] text-inkSoft hover:text-inkDeep"
            style={{ borderBottom: "1px dashed #C9C6C0" }}
          >
            ↓ save as note
          </button>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-hairlineFaint space-y-5">
          <div
            className="text-[11px] uppercase text-inkSoft"
            style={{ letterSpacing: "0.08em", fontWeight: 500 }}
          >
            Pinned answers
          </div>
          {notes.map((n, i) => (
            <div key={i}>
              <div className="font-display italic text-[14px] text-inkSoft mb-1">
                {n.question}
              </div>
              <p
                className="font-display text-[16px] text-inkDeep"
                style={{ lineHeight: 1.5 }}
              >
                {render(n.answer)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
