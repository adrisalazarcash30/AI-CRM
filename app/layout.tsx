import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipeline — AI-native CRM",
  description: "Other CRMs ask reps to feed the system. Ours feeds the rep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink">{children}</body>
    </html>
  );
}
