import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F3F3",
        surface: "#FFFFFF",
        ink: "#181818",
        muted: "#706E6B",
        line: "#DDDBDA",
        brand: {
          DEFAULT: "#0176D3",
          dark: "#014486",
          light: "#1B96FF",
          tint: "#EAF5FE",
          bar: "#AACBEE",
          barHover: "#7FB1E3",
        },
        navy: "#032D60",
        emerald: { DEFAULT: "#2E844A" },
        danger: { DEFAULT: "#BA0517" },
        warn: { DEFAULT: "#FE9339" },
        // Editorial palette for the Pipeline canvas
        paper: "#FAFAF7",
        paperHover: "#FCFBF8",
        hairline: "#E8E6E1",
        hairlineFaint: "#F0EEE9",
        hairlineDeep: "#D8D5CE",
        inkDeep: "#0A0A0A",
        inkSoft: "#6B6862",
        inkFaint: "#C9C6C0",
        forest: "#047857",
        amberWarn: "#B45309",
        navy400: "#2A3B5A",
        navy500: "#243B68",
        navy600: "#1A2F52",
        navy700: "#0F1F3D",
      },
      fontFamily: {
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: [
          "'Salesforce Sans'",
          "'Inter Tight'",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
      },
      boxShadow: {
        card: "0 2px 2px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.04)",
        pop: "0 2px 8px rgba(0,0,0,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
