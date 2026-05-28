import { createServerClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import ContactsTable from "@/components/ContactsTable";
import type { Company, Contact, Deal } from "@/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createServerClient();
  const [
    { data: contacts },
    { data: companies },
    { data: deals },
    { data: users },
  ] = await Promise.all([
    supabase.from("contacts").select("*").order("name"),
    supabase.from("companies").select("*").order("name"),
    supabase.from("deals").select("*"),
    supabase.from("users").select("*"),
  ]);

  const totalOpen = (deals ?? []).filter(
    (d: Deal) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  ).length;

  return (
    <AppShell
      active="contacts"
      users={users ?? []}
      pageTitle="Contacts"
      pageMeta={`${(contacts ?? []).length} contacts · ${totalOpen} open deals`}
    >
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <ContactsTable
          contacts={(contacts ?? []) as Contact[]}
          companies={(companies ?? []) as Company[]}
          deals={(deals ?? []) as Deal[]}
        />
      </div>
    </AppShell>
  );
}
