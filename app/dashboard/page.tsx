import { createServerClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Activity, Company, Deal, User } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const [
    { data: deals },
    { data: activities },
    { data: users },
    { data: companies },
  ] = await Promise.all([
    supabase.from("deals").select("*"),
    supabase.from("activities").select("*"),
    supabase.from("users").select("*").order("name"),
    supabase.from("companies").select("*"),
  ]);

  return (
    <AppShell active="dashboard" users={(users ?? []) as User[]}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-8">
        <DashboardClient
          deals={(deals ?? []) as Deal[]}
          activities={(activities ?? []) as Activity[]}
          users={(users ?? []) as User[]}
          companies={(companies ?? []) as Company[]}
        />
      </div>
    </AppShell>
  );
}
