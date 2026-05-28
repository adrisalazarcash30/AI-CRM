"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type DropdownItem =
  | {
      kind: "link";
      label: string;
      href: string;
      icon?: ReactNode;
      meta?: string;
    }
  | {
      kind: "action";
      label: string;
      onClick: () => void;
      icon?: ReactNode;
      meta?: string;
      destructive?: boolean;
      active?: boolean;
    }
  | { kind: "header"; label: string }
  | { kind: "divider" };

interface Props {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  width?: number;
  className?: string;
}

export default function Dropdown({
  trigger,
  items,
  align = "left",
  width = 240,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex"
      >
        {trigger}
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 z-50 bg-white border border-line rounded-md shadow-pop py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{ width, boxShadow: "0 8px 24px rgba(10,10,10,0.12)" }}
        >
          {items.map((it, i) => {
            if (it.kind === "divider")
              return <div key={i} className="my-1 border-t border-line" />;
            if (it.kind === "header")
              return (
                <div
                  key={i}
                  className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted"
                  style={{ letterSpacing: "0.18em" }}
                >
                  {it.label}
                </div>
              );
            const inner = (
              <>
                {it.icon && <span className="shrink-0 text-muted">{it.icon}</span>}
                <span className="flex-1 truncate">{it.label}</span>
                {it.meta && (
                  <span className="text-[11px] text-muted">{it.meta}</span>
                )}
              </>
            );
            const cls = `flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left hover:bg-canvas ${
              it.kind === "action" && it.destructive ? "text-danger" : "text-ink"
            } ${it.kind === "action" && it.active ? "font-semibold bg-canvas" : ""}`;
            if (it.kind === "link") {
              return (
                <a key={i} href={it.href} className={cls} onClick={() => setOpen(false)}>
                  {inner}
                </a>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  it.onClick();
                  setOpen(false);
                }}
                className={cls}
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
