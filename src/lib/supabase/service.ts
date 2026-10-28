import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/config/env";

let client: SupabaseClient | undefined;

/**
 * Server-only Supabase client using the service-role key. It bypasses RLS, so it must only be used
 * from server code after any required authorisation check. Never import from client components.
 */
export function getServiceClient(): SupabaseClient | null {
  const { supabase } = getEnv();
  if (!supabase.configured || !supabase.url || !supabase.serviceRoleKey) return null;
  if (!client) {
    client = createClient(supabase.url, supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(8000) }) },
    });
  }
  return client;
}
