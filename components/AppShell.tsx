"use client";

import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  HelpCircle,
  Settings,
  Star,
  Plus,
  Cloud,
  LayoutGrid,
  ChevronDown,
  Users as UsersIcon,
  Building2,
  DollarSign,
  Upload,
  BarChart3,
  FileText,
  LogOut,
  Keyboard,
  BookOpen,
  Slack,
  RefreshCw,
} from "lucide-react";
import RepSwitcher from "./RepSwitcher";
import Dropdown, { type DropdownItem } from "./Dropdown";
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
  pageTitle: string;
  pageMeta?: string;
  children: React.ReactNode;
}

interface Tab {
  key: NavKey;
  label: string;
  href: string;
  subItems?: DropdownItem[];
}

const TABS: Tab[] = [
  {
    key: "pipeline",
    label: "Pipeline",
    href: "/",
    subItems: [
      { kind: "header", label: "Views" },
      { kind: "link", label: "Kanban board", href: "/" },
      { kind: "link", label: "Reports overview", href: "/reports" },
      { kind: "link", label: "Leader dashboard", href: "/dashboard" },
    ],
  },
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    subItems: [
      { kind: "header", label: "Dashboards" },
      { kind: "link", label: "Pipeline overview", href: "/dashboard" },
      { kind: "link", label: "Sales reports", href: "/reports" },
    ],
  },
  {
    key: "contacts",
    label: "Contacts",
    href: "/contacts",
    subItems: [
      { kind: "header", label: "People" },
      { kind: "link", label: "All contacts", href: "/contacts" },
      { kind: "link", label: "All companies", href: "/companies" },
      { kind: "divider" },
      { kind: "link", label: "Import contacts", href: "/import" },
    ],
  },
  {
    key: "companies",
    label: "Companies",
    href: "/companies",
    subItems: [
      { kind: "link", label: "All companies", href: "/companies" },
      { kind: "link", label: "All contacts", href: "/contacts" },
    ],
  },
  {
    key: "import",
    label: "Import",
    href: "/import",
    subItems: [
      { kind: "header", label: "Bulk data" },
      { kind: "link", label: "Upload CSV", href: "/import" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    href: "/reports",
    subItems: [
      { kind: "header", label: "Analytics" },
      { kind: "link", label: "Sales performance", href: "/reports" },
      { kind: "link", label: "Leader dashboard", href: "/dashboard" },
    ],
  },
];

export default function AppShell({ active, users, pageTitle, pageMeta, children }: Props) {
  const router = useRouter();

  const createItems: DropdownItem[] = [
    { kind: "header", label: "Create new" },
    {
      kind: "link",
      label: "Deal",
      href: "/?new=deal",
      icon: <DollarSign size={14} />,
    },
    {
      kind: "link",
      label: "Contact",
      href: "/contacts?new=1",
      icon: <UsersIcon size={14} />,
    },
    {
      kind: "link",
      label: "Company",
      href: "/companies?new=1",
      icon: <Building2 size={14} />,
    },
    { kind: "divider" },
    {
      kind: "link",
      label: "Import from CSV",
      href: "/import",
      icon: <Upload size={14} />,
    },
  ];

  const appLauncherItems: DropdownItem[] = [
    { kind: "header", label: "Jump to" },
    { kind: "link", label: "Pipeline", href: "/", icon: <LayoutGrid size={14} /> },
    { kind: "link", label: "Dashboard", href: "/dashboard", icon: <BarChart3 size={14} /> },
    { kind: "link", label: "Reports", href: "/reports", icon: <FileText size={14} /> },
    { kind: "link", label: "Contacts", href: "/contacts", icon: <UsersIcon size={14} /> },
    { kind: "link", label: "Companies", href: "/companies", icon: <Building2 size={14} /> },
    { kind: "link", label: "Import", href: "/import", icon: <Upload size={14} /> },
  ];

  const starItems: DropdownItem[] = [
    { kind: "header", label: "Favorites" },
    { kind: "link", label: "Pipeline · Kanban", href: "/" },
    { kind: "link", label: "Reports · Team", href: "/reports" },
    { kind: "divider" },
    {
      kind: "action",
      label: "Star current page",
      onClick: () => alert("This page has been starred"),
    },
  ];

  const bellItems: DropdownItem[] = [
    { kind: "header", label: "Notifications" },
    {
      kind: "action",
      label: "Slack: Acme moved to Negotiation",
      onClick: () => router.push("/"),
      icon: <Slack size={14} />,
      meta: "2m",
    },
    {
      kind: "action",
      label: "Claude flagged 3 stalled deals",
      onClick: () => router.push("/reports"),
      icon: <RefreshCw size={14} />,
      meta: "1h",
    },
    {
      kind: "action",
      label: "Sarah closed Globex Renewal",
      onClick: () => router.push("/dashboard"),
      icon: <DollarSign size={14} />,
      meta: "yesterday",
    },
    { kind: "divider" },
    {
      kind: "action",
      label: "Mark all as read",
      onClick: () => alert("Marked all read"),
    },
  ];

  const settingsItems: DropdownItem[] = [
    { kind: "header", label: "Settings" },
    { kind: "link", label: "Import data", href: "/import", icon: <Upload size={14} /> },
    {
      kind: "link",
      label: "Pipeline stages",
      href: "/",
      icon: <LayoutGrid size={14} />,
    },
    { kind: "divider" },
    {
      kind: "action",
      label: "Refresh data",
      onClick: () => router.refresh(),
      icon: <RefreshCw size={14} />,
    },
  ];

  const helpItems: DropdownItem[] = [
    { kind: "header", label: "Help" },
    {
      kind: "action",
      label: "Demo script",
      onClick: () => alert("1. Brief 2. Drag deal 3. Log activity 4. Ask Claude 5. Reports"),
      icon: <BookOpen size={14} />,
    },
    {
      kind: "action",
      label: "Keyboard shortcuts",
      onClick: () => alert("⌘K — search · ⌘N — new deal · ⌘/ — Ask Claude"),
      icon: <Keyboard size={14} />,
    },
  ];

  const avatarInitials = (users[0]?.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarItems: DropdownItem[] = [
    { kind: "header", label: users[0]?.name ?? "Demo user" },
    {
      kind: "link",
      label: "View dashboard",
      href: "/dashboard",
      icon: <BarChart3 size={14} />,
    },
    { kind: "link", label: "My reports", href: "/reports", icon: <FileText size={14} /> },
    { kind: "divider" },
    {
      kind: "action",
      label: "Sign out",
      onClick: () => alert("Demo mode — sign out disabled"),
      icon: <LogOut size={14} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Top blue global header */}
      <header className="bg-brand text-white">
        <div className="px-4 h-12 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <Cloud size={22} className="text-white" />
          </a>
          <div className="hidden md:flex items-center gap-2 ml-2">
            <Dropdown
              align="left"
              width={200}
              items={[
                { kind: "header", label: "Apps" },
                ...appLauncherItems.filter((i) => i.kind !== "header"),
              ]}
              trigger={
                <span className="flex items-center gap-1 text-sm bg-white/10 hover:bg-white/15 rounded px-2.5 py-1">
                  All <ChevronDown size={12} className="opacity-70" />
                </span>
              }
            />
          </div>
          <form
            className="flex-1 max-w-2xl mx-auto relative"
            onSubmit={(e) => {
              e.preventDefault();
              const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement)
                .value;
              if (q.trim()) router.push(`/contacts?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              name="q"
              placeholder="Search deals, companies, contacts..."
              className="w-full bg-white text-ink placeholder:text-muted rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </form>
          <div className="flex items-center gap-1 text-white">
            <Dropdown
              align="right"
              items={starItems}
              trigger={<IconChrome><Star size={16} /></IconChrome>}
            />
            <Dropdown
              align="right"
              items={createItems}
              trigger={<IconChrome><Plus size={16} /></IconChrome>}
            />
            <Dropdown
              align="right"
              items={helpItems}
              trigger={<IconChrome><HelpCircle size={16} /></IconChrome>}
            />
            <Dropdown
              align="right"
              items={settingsItems}
              trigger={<IconChrome><Settings size={16} /></IconChrome>}
            />
            <Dropdown
              align="right"
              width={300}
              items={bellItems}
              trigger={<IconChrome><Bell size={16} /></IconChrome>}
            />
            <Dropdown
              align="right"
              width={220}
              items={avatarItems}
              trigger={
                <span className="ml-1 w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-medium">
                  {avatarInitials}
                </span>
              }
            />
          </div>
        </div>
      </header>

      {/* App identity row */}
      <div className="bg-white border-b border-line">
        <div className="px-4 h-12 flex items-center gap-3">
          <Dropdown
            align="left"
            items={appLauncherItems}
            trigger={
              <span className="text-muted hover:text-ink p-1.5 rounded hover:bg-canvas flex">
                <LayoutGrid size={16} />
              </span>
            }
          />
          <a
            href="/"
            className="font-display text-base text-navy whitespace-nowrap hover:underline"
          >
            Pipeline
          </a>
          <div className="ml-auto flex items-center gap-3">
            {pageMeta && (
              <span className="text-xs uppercase tracking-wider text-muted hidden lg:inline">
                {pageMeta}
              </span>
            )}
            <RepSwitcher users={users} />
          </div>
        </div>
      </div>

      {/* Lightning-style tab bar */}
      <div className="bg-brand-bar border-b border-brand/30 relative">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #ffffff 0, transparent 60%), radial-gradient(circle at 80% 20%, #ffffff 0, transparent 50%)",
          }}
        />
        <nav className="relative px-4 flex items-end gap-0 h-11">
          {TABS.map((t) => {
            const isActive = t.key === active;
            const cls = `relative px-3 h-10 mt-1 flex items-center gap-1 text-sm whitespace-nowrap rounded-t transition-colors ${
              isActive
                ? "bg-white text-brand font-semibold shadow-card"
                : "text-navy/80 hover:bg-white/40"
            }`;
            return (
              <div key={t.key} className="flex items-stretch">
                <a href={t.href} className={cls + " pr-1"}>
                  <span>{t.label}</span>
                  {isActive && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-white" />
                  )}
                </a>
                {t.subItems && (
                  <Dropdown
                    align="left"
                    items={t.subItems}
                    trigger={
                      <span
                        className={`h-10 mt-1 flex items-center px-1.5 rounded-t cursor-pointer ${
                          isActive ? "bg-white" : "hover:bg-white/40"
                        }`}
                      >
                        <ChevronDown
                          size={12}
                          className={isActive ? "text-brand" : "text-navy/70"}
                        />
                      </span>
                    }
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function IconChrome({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-8 h-8 rounded hover:bg-white/15 flex items-center justify-center">
      {children}
    </span>
  );
}
