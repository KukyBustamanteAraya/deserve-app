// src/app/auth/confirm/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMyProfile } from '@/lib/db/profiles';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get('token_hash') ?? '';
  const type = (url.searchParams.get('type') ?? 'email') as 'email';
  const next = url.searchParams.get('next') || '/dashboard';
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  const supabase = createClient();

  // Preserve next parameter for error redirects
  const nextParam = next && next.startsWith('/') ? `&next=${encodeURIComponent(next)}` : '';

  if (!token_hash) {
    if (debug) console.error('[auth/confirm] missing token_hash', url.toString());
    const errorMessage = encodeURIComponent('Link expired or already used. Request a new link.');
    return NextResponse.redirect(new URL(`/login?error=${errorMessage}${nextParam}`, url.origin));
  }

  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    if (debug) console.error('[auth/confirm] verifyOtp error:', error);
    // Use friendly error message instead of raw error
    const friendlyMessage = encodeURIComponent('Link expired or already used. Request a new link.');
    return NextResponse.redirect(new URL(`/login?error=${friendlyMessage}${nextParam}`, url.origin));
  }

  if (debug) console.log('[auth/confirm] verifyOtp ok; user:', data?.user?.id);

  // Track successful magic link verification
  if (debug) console.log('[analytics] auth_magic_verified for user:', data?.user?.id);

  // Check if user has set password before (first-time user flow)
  // Use profiles table instead of user metadata for more reliable state
  const { user, profile, error: profileError } = await getMyProfile();
  let hasPassword = profile?.has_password === true;

  if (profileError) {
    if (debug) console.error('[auth/confirm] Failed to load profile:', profileError);
    // If we can't load profile, fall back to metadata check
    const { data: { user: authUser } } = await supabase.auth.getUser();
    hasPassword = authUser?.user_metadata?.password_set === true;
  }

  // preserve any ?next=... but keep it same-origin relative
  const rawNext = url.searchParams.get('next') || '/dashboard';
  const safeNext = rawNext.startsWith('/') ? rawNext : '/dashboard';

  const target = hasPassword
    ? safeNext
    : `/onboarding/set-password?next=${encodeURIComponent(safeNext)}`;

  if (debug) console.log('[auth/confirm] redirect target:', target, 'hasPassword:', hasPassword);

  return NextResponse.redirect(new URL(target, url.origin));
}