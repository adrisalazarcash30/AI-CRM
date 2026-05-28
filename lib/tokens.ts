// Pipeline CRM design tokens — single source of truth for visual language.
// Components should never reference hardcoded hex values; reference tokens
// here (or the matching Tailwind class which maps to the same value).

export const tokens = {
  color: {
    // Surfaces
    bg: "#FAFAF7",           // paper        — page background
    surface: "#FFFFFF",      // white        — cards
    surfaceAlt: "#FCFBF8",   // paperHover   — hover state for cards/rows
    surfaceSunk: "#F4F2EC",  //              — sub-toolbars, inactive panels

    // Text
    textPrimary: "#0A0A0A",   // inkDeep
    textSecondary: "#6B6862", // inkSoft
    textTertiary: "#A8A49C",  //              — captions, helpers
    textInverse: "#FFFFFF",

    // Borders
    border: "#E8E6E1",        // hairline
    borderStrong: "#D8D5CE",  // hairlineDeep
    borderFocus: "#0A0A0A",

    // Accent — single, used sparingly
    accent: "#047857",        // forest — money, success, primary action
    accentSoft: "#ECFDF5",    //         — accent backgrounds

    // Status
    risk: "#B45309",          // amberWarn — medium-risk
    danger: "#9F2D2D",        //           — high-risk / lost

    // Brand — used ONLY in the chevron stage bar
    navy: "#0F1F3D",
  },
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  size: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "22px",
    "3xl": "28px",
    "4xl": "36px",
  },
  radius: { sm: "4px", md: "6px", lg: "8px" },
  space: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "24px",
    6: "32px",
    7: "48px",
  },
  shadow: {
    card: "none",
    hover: "0 1px 2px rgba(10,10,10,0.04)",
    drawer: "0 0 60px rgba(0,0,0,0.08)",
    popover:
      "0 4px 16px rgba(10,10,10,0.08), 0 1px 3px rgba(10,10,10,0.06)",
  },
  motion: {
    fast: "80ms ease-out",
    base: "120ms ease-out",
    slow: "200ms ease-out",
  },
} as const;

export type Tokens = typeof tokens;

// Standard date format used across the app: 15 Jul 2026
export function formatDateStandard(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
