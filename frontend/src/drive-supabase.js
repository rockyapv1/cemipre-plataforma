/** Cliente exclusivo del módulo DRV-03. Nunca usar SERVICE_ROLE_KEY en Vite. */
import { createClient } from '@supabase/supabase-js';

let client = null;
export function isDriveConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
export function driveSupabase() {
  if (!isDriveConfigured()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
  }
  return client;
}
