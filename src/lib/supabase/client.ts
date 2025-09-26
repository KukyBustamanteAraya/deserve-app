// src/lib/supabase/client.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Dev-only guard to catch misconfig early
if (process.env.NODE_ENV !== 'production') {
  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local/.env.example.'
    );
  }
}

// Export a single browser client instance
export const supabaseBrowser = createSupabaseClient(url, anon);

// Maintain compatibility with existing imports
export function createClient() {
  return supabaseBrowser;
}