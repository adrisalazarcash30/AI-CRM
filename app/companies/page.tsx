import { createServerClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import CompaniesTable from "@/components/CompaniesTable";
import type { Company, Contact, Deal } from "@/types";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const supabase = createServerClient();
  const [
    { data: companies },
    { data: contacts },
    { data: deals },
    { data: users },
  ] = await Promise.all([
    supabase.from("companies").select("*").order("name"),
    supabase.from("contacts").select("*"),
    supabase.from("deals").select("*"),
    supabase.from("users").select("*"),
  ]);

  return (
    <AppShell
      active="companies"
      users={users ?? []}
      pageTitle="Companies"
      pageMeta={`${(companies ?? []).length} companies`}
    >
      <div className="max-w-[1600px] mx-auto px-4 py-5">
        <CompaniesTable
          companies={(companies ?? []) as Company[]}
          contacts={(contacts ?? []) as Contact[]}
          deals={(deals ?? []) as Deal[]}
        />
      </div>
    </AppShell>
  );
}
