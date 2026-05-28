import "./globals.css";
import type { Metadata } from "next";
import CommandPalette from "@/components/CommandPalette";
import TodayFocus from "@/components/TodayFocus";

export const metadata: Metadata = {
  title: "Pipeline — AI-native CRM",
  description: "Other CRMs ask reps to feed the system. Ours feeds the rep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-inkDeep">
        {children}
        <CommandPalette />
        <TodayFocus />
      </body>
    </html>
  );
}
