import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function pickKey(): string {
  const key = (serviceKey && serviceKey.length > 10 ? serviceKey : anonKey) || "";
  if (!key) {
    throw new Error(
      "Supabase key missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (and optionally SUPABASE_SERVICE_ROLE_KEY) in .env.local"
    );
  }
  return key;
}

export function createBrowserClient(): SupabaseClient {
  return createClient(url || "", anonKey || "", { auth: { persistSession: false } });
}

export function createServerClient(): SupabaseClient {
  return createClient(url || "", pickKey(), { auth: { persistSession: false } });
}
