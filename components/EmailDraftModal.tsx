"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, Send, Copy, RefreshCw } from "lucide-react";
import type { Contact } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  dealId: string;
  dealName: string;
  contacts: Contact[];
  ownerId?: string | null;
}

export default function EmailDraftModal({
  open,
  onClose,
  dealId,
  dealName,
  contacts,
  ownerId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>(
    contacts.find((c) => c.email)?.id ?? contacts[0]?.id ?? ""
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      void generate(selectedContactId);
    } else {
      setError(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function generate(contactId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/compose-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, contactId, senderId: ownerId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setTo(j.to ?? "");
      setSubject(j.subject ?? "");
      setBody(j.body ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function openInEmailClient() {
    // Use encodeURIComponent (spaces -> %20). URLSearchParams encodes spaces
    // as "+" which Outlook renders literally in the email body.
    const qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = `mailto:${encodeURIComponent(to)}?${qs}`;
  }

  async function copyAll() {
    const text = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-inkDeep/40" onClick={onClose} />
      <div
        className="relative bg-white border border-hairline rounded-md w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        style={{ boxShadow: "0 8px 40px rgba(10,10,10,0.16)" }}
      >
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-forest text-white flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="font-display text-[18px] text-inkDeep leading-tight">
                Draft follow-up email
              </h3>
              <div className="text-[12px] text-inkSoft">
                Claude reading past activity for {dealName}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-inkSoft hover:text-inkDeep">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto scrollbar-thin">
          {contacts.length > 1 && (
            <div>
              <Label>Recipient</Label>
              <select
                value={selectedContactId}
                onChange={(e) => {
                  setSelectedContactId(e.target.value);
                  void generate(e.target.value);
                }}
                className="w-full bg-paper border border-hairline rounded px-2.5 py-2 text-sm focus:outline-none focus:border-inkDeep"
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` (${c.email})` : " (no email)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>To</Label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="contact@company.com"
              className="w-full bg-paper border border-hairline rounded px-2.5 py-2 text-sm focus:outline-none focus:border-inkDeep"
            />
          </div>

          <div>
            <Label>Subject</Label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
              className="w-full bg-paper border border-hairline rounded px-2.5 py-2 text-sm focus:outline-none focus:border-inkDeep disabled:opacity-50"
            />
          </div>

          <div>
            <Label>Body</Label>
            <textarea
              value={loading ? "Claude is drafting…" : body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loading}
              rows={12}
              className="w-full bg-paper border border-hairline rounded px-3 py-2.5 text-[14px] leading-relaxed font-sans focus:outline-none focus:border-inkDeep resize-y disabled:opacity-60"
              style={{ fontFamily: "'Inter Tight', system-ui, sans-serif" }}
            />
          </div>

          {error && (
            <div className="text-xs text-amberWarn">Error: {error}</div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between gap-2 bg-paper">
          <button
            onClick={() => void generate(selectedContactId)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-hairline rounded bg-white hover:border-inkDeep disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Regenerate
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-hairline rounded bg-white hover:border-inkDeep disabled:opacity-50"
            >
              <Copy size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={openInEmailClient}
              disabled={loading || !subject}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-forest text-white rounded disabled:opacity-30 hover:opacity-90"
            >
              <Send size={12} />
              Open in email client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase font-semibold text-inkSoft mb-1"
      style={{ letterSpacing: "0.18em" }}
    >
      {children}
    </div>
  );
}
