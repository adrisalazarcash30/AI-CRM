import { createServerClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import ReportsView from "@/components/ReportsView";
import type { Activity, Company, Deal, User } from "@/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
    <AppShell
      active="reports"
      users={users ?? []}
      pageTitle="Reports"
      pageMeta="Sales performance"
    >
      <div className="max-w-[1600px] mx-auto px-4 py-5">
        <ReportsView
          deals={(deals ?? []) as Deal[]}
          activities={(activities ?? []) as Activity[]}
          users={(users ?? []) as User[]}
          companies={(companies ?? []) as Company[]}
        />
      </div>
    </AppShell>
  );
}
