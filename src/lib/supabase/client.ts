// src/lib/supabase/client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _client = createBrowserClient(url, anon);
  return _client;
}

// Backward compatibility - deprecated, use getBrowserClient() instead
export const supabaseBrowser = new Proxy({} as any, {
  get: (_, prop) => {
    const client = getBrowserClient();
    return client[prop as keyof typeof client];
  }
});

// Legacy export for compatibility
export function createClient() {
  return getBrowserClient();
}
