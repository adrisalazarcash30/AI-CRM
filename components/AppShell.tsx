"use client";

import RepSwitcher from "./RepSwitcher";
import type { User } from "@/types";

type NavKey =
  | "pipeline"
  | "dashboard"
  | "contacts"
  | "companies"
  | "import"
  | "reports"
  | "settings";

interface Props {
  active: NavKey;
  users: User[];
  pageTitle?: string;
  pageMeta?: string;
  children: React.ReactNode;
}

const TABS: { key: NavKey; label: string; href: string }[] = [
  { key: "pipeline", label: "Pipeline", href: "/" },
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "reports", label: "Reports", href: "/reports" },
  { key: "contacts", label: "Contacts", href: "/contacts" },
  { key: "companies", label: "Companies", href: "/companies" },
  { key: "import", label: "Import", href: "/import" },
];

export default function AppShell({ active, users, pageMeta, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-inkDeep">
      <header className="bg-white border-b border-hairline h-14 flex items-center sticky top-0 z-30">
        <div className="max-w-[1600px] w-full mx-auto px-6 md:px-8 flex items-center gap-8">
          <a
            href="/"
            className="font-display text-[19px] text-inkDeep tracking-tight whitespace-nowrap"
            style={{ fontWeight: 500 }}
          >
            Pipeline
          </a>
          <nav className="flex items-center gap-6 text-[13px]">
            {TABS.map((t) => {
              const isActive = t.key === active;
              return (
                <a
                  key={t.key}
                  href={t.href}
                  className={
                    isActive
                      ? "text-inkDeep font-medium relative"
                      : "text-inkSoft hover:text-inkDeep"
                  }
                  style={
                    isActive
                      ? { borderBottom: "2px solid #047857", paddingBottom: "2px" }
                      : undefined
                  }
                >
                  {t.label}
                </a>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {pageMeta && (
              <span
                className="text-[11px] uppercase text-inkSoft hidden lg:inline"
                style={{ letterSpacing: "0.08em" }}
              >
                {pageMeta}
              </span>
            )}
            <RepSwitcher users={users} />
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
