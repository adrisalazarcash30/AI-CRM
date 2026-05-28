"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface Fact {
  label: string;
  value: ReactNode;
}

interface Props {
  trigger: ReactNode;
  title: string;
  subtitle?: string;
  initials?: string;
  facts?: Fact[];
  href?: string;
  className?: string;
}

export default function HoverCard({
  trigger,
  title,
  subtitle,
  initials,
  facts = [],
  href,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  function onEnter() {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (open) return;
    showTimer.current = window.setTimeout(() => setOpen(true), 300);
  }

  function onLeave() {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    hideTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {trigger}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-[320px] bg-white border border-hairline rounded-md p-4 text-left"
          style={{
            boxShadow:
              "0 4px 16px rgba(10,10,10,0.08), 0 1px 3px rgba(10,10,10,0.06)",
          }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          <div className="flex items-start gap-3 mb-3">
            {initials && (
              <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div
                className="font-display text-[16px] text-inkDeep leading-tight"
                style={{ fontWeight: 500 }}
              >
                {title}
              </div>
              {subtitle && (
                <div className="text-[12px] text-inkSoft mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-inkSoft hover:text-inkDeep opacity-0 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-3">
              {facts.map((f, i) => (
                <div key={i}>
                  <div
                    className="text-[10px] uppercase text-[#A8A49C] mb-0.5"
                    style={{ letterSpacing: "0.08em", fontWeight: 500 }}
                  >
                    {f.label}
                  </div>
                  <div className="text-[13px] text-inkDeep">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {href && (
            <div className="flex justify-end pt-2 border-t border-hairlineFaint">
              <a
                href={href}
                className="text-[12px] text-inkSoft hover:text-inkDeep"
                style={{ borderBottom: "1px dashed #C9C6C0" }}
              >
                View full record →
              </a>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
