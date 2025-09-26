// src/lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const isProd = process.env.NODE_ENV === 'production';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            // enforce safer defaults
            cookieStore.set({
              name,
              value,
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: isProd,
            });
          } catch (error) {
            // Cookies can only be modified in Server Actions or Route Handlers
            // Silently fail when called from Server Components during render
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: isProd,
              maxAge: 0,
            });
          } catch (error) {
            // Cookies can only be modified in Server Actions or Route Handlers
            // Silently fail when called from Server Components during render
          }
        },
      },
    }
  );
}

// Maintain compatibility with existing imports
export const createClient = createSupabaseServerClient;