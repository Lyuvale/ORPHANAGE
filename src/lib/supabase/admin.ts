import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service role key.
 *
 * This client bypasses Row Level Security and should ONLY be used
 * for administrative operations (centre CRUD, user management, etc.).
 *
 * NEVER expose this client to the browser. Server-side only.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
