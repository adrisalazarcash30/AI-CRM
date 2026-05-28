"use client";

import type { ReactNode } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  href?: string;
  className?: string;
}

const PAD: Record<NonNullable<Props["padding"]>, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  title,
  subtitle,
  actions,
  children,
  padding = "md",
  interactive,
  href,
  className = "",
}: Props) {
  const base = `bg-white border border-hairline rounded-md ${PAD[padding]} ${
    interactive
      ? "hover:bg-paperHover hover:border-hairlineDeep transition-all duration-100 ease-out cursor-pointer"
      : ""
  } ${className}`;

  const inner = (
    <>
      {(title || subtitle || actions) && (
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <div>
            {title && (
              <div
                className="text-[11px] uppercase text-inkSoft"
                style={{ letterSpacing: "0.08em", fontWeight: 500 }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <h2
                className="font-display text-[20px] text-inkDeep mt-1"
                style={{ fontWeight: 500 }}
              >
                {subtitle}
              </h2>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </>
  );

  return href ? (
    <a href={href} className={base}>
      {inner}
    </a>
  ) : (
    <section className={base}>{inner}</section>
  );
}
