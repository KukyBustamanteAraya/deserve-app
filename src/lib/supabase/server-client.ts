// Compatibility shim - re-exports from the main server module
export { createSupabaseServerClient as createSupabaseServer, createClient } from '@/lib/supabase/server';

// Helper to verify authentication and get user
export async function requireAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required');
  }

  return user;
}