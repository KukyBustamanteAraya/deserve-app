// src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

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

export function createClient() {
  return createBrowserClient(url, anon);
}

// Export a single browser client instance for compatibility
export const supabaseBrowser = createClient();