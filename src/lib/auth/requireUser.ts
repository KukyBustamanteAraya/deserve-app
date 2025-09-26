// src/lib/auth/requireUser.ts
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireUser(currentPath?: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('requireUser: Server-side auth check:', {
    hasUser: !!user,
    error: error?.message,
    userId: user?.id
  });

  if (error || !user) {
    console.log('requireUser: Redirecting to login - no valid session');
    const nextParam = currentPath && currentPath.startsWith('/')
      ? `?next=${encodeURIComponent(currentPath)}`
      : '';
    redirect(`/login${nextParam}`);
  }
  return user; // auth-only
}

export async function getUserProfileOrNull() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile ?? null;
}