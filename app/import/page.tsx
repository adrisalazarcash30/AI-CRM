import { createServerClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import CsvImporter from "@/components/CsvImporter";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = createServerClient();
  const { data: users } = await supabase.from("users").select("*");

  return (
    <AppShell
      active="import"
      users={users ?? []}
      pageTitle="Import"
      pageMeta="Bulk CSV upload"
    >
      <div className="max-w-[1100px] mx-auto px-6 py-6">
        <CsvImporter />
      </div>
    </AppShell>
  );
}
