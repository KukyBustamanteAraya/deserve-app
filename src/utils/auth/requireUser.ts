// src/utils/auth/requireUser.ts
import { createClient } from '@/utils/supabase/server';

export async function requireUserOrRedirect(currentPath?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Preserve the current path if provided and it's a valid relative path
    const nextParam = currentPath && currentPath.startsWith('/')
      ? `&next=${encodeURIComponent(currentPath)}`
      : '';
    return { redirectTo: `/login?error=please_log_in${nextParam}` } as const;
  }

  return { user } as const;
}