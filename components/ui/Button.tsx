"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-forest text-white hover:opacity-90 disabled:opacity-30",
  secondary:
    "bg-white text-inkDeep border border-hairlineDeep hover:border-inkDeep disabled:opacity-50",
  ghost: "bg-transparent text-inkSoft hover:text-inkDeep",
  danger:
    "bg-white text-[#9F2D2D] border border-hairlineDeep hover:border-[#9F2D2D] disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  icon,
  loading,
  fullWidth,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 text-[13px] font-medium rounded px-3.5 py-2 transition-colors duration-[80ms] ease-out ${
        VARIANTS[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
      style={{ fontWeight: 500 }}
    >
      {loading ? <span className="w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" /> : icon}
      {children}
    </button>
  );
}
