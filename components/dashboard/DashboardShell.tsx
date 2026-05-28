"use client";

import { initials } from "@/lib/format";
import type { User } from "@/types";

export default function DashboardShell({
  users,
  children,
}: {
  users: User[];
  children: React.ReactNode;
}) {
  const me = users[0];
  return (
    <div className="min-h-screen bg-paper text-inkDeep">
      <header className="bg-white border-b border-hairline h-14 flex items-center">
        <div className="max-w-[1280px] w-full mx-auto px-12 md:px-12 px-6 flex items-center gap-8">
          <a
            href="/"
            className="font-display text-[19px] text-inkDeep tracking-tight"
            style={{ fontWeight: 500 }}
          >
            Pipeline
          </a>
          <nav className="flex items-center gap-6 text-[13px]">
            <a href="/" className="text-inkSoft hover:text-inkDeep">
              Pipeline
            </a>
            <a href="/dashboard" className="text-inkDeep font-medium">
              Dashboard
            </a>
            <a href="/reports" className="text-inkSoft hover:text-inkDeep">
              Reports
            </a>
            <a href="/contacts" className="text-inkSoft hover:text-inkDeep">
              Contacts
            </a>
            <a href="/companies" className="text-inkSoft hover:text-inkDeep">
              Companies
            </a>
            <a href="/import" className="text-inkSoft hover:text-inkDeep">
              Import
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px] text-inkSoft hidden md:inline">
              {me?.name ?? ""}
            </span>
            <span className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-[11px] font-semibold">
              {initials(me?.name)}
            </span>
          </div>
        </div>
      </header>
      <main className="max-w-[1280px] mx-auto px-6 md:px-12 py-8">{children}</main>
    </div>
  );
}
