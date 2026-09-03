import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Cookie-free Supabase client for public, cacheable reads.
 *
 * createServerSupabaseClient() reads cookies, which forces any route that
 * calls it to render dynamically — that's what throws DYNAMIC_SERVER_USAGE
 * when a public blog page tries to statically regenerate after publish.
 *
 * Anon key only, no session. RLS still applies exactly as it would for a
 * logged-out visitor, so this can only ever read status = 'published' rows.
 * Use createServerSupabaseClient() for anything inside /studio.
 */
export function createPublicSupabaseClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
