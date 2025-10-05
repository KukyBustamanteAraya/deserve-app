// Server Component Supabase client - for RSC, server actions, data fetching
// Uses @supabase/ssr official helpers - NO silent failures
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

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
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Expected during RSC render - cookies can't be set
            // Server Actions and Route Handlers CAN set cookies
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Expected during RSC render
          }
        },
      },
    }
  );
}

// Maintain compatibility with existing imports
export const createClient = createSupabaseServerClient;