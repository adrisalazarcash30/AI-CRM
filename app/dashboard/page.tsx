import { createServerClient } from "@/lib/supabase";
import DashboardShell from "@/components/dashboard/DashboardShell";
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
    <DashboardShell users={(users ?? []) as User[]}>
      <DashboardClient
        deals={(deals ?? []) as Deal[]}
        activities={(activities ?? []) as Activity[]}
        users={(users ?? []) as User[]}
        companies={(companies ?? []) as Company[]}
      />
    </DashboardShell>
  );
}
