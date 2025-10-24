// src/lib/auth/requireUser.ts
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function requireUser() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  logger.debug('requireUser: Server-side auth check:', {
    hasUser: !!user,
    error: error?.message,
    userId: user?.id
  });

  if (error || !user) {
    logger.debug('requireUser: Redirecting to login - no valid session');
    redirect('/login');
  }
  return user; // auth-only
}

export async function getUserProfileOrNull() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile ?? null;
}