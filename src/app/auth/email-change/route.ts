import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get('token_hash') ?? '';
  const type = (url.searchParams.get('type') ?? 'email_change') as 'email_change';
  const rawNext = url.searchParams.get('next') || '/settings/account';
  const next = rawNext.startsWith('/') ? rawNext : '/settings/account';
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  if (debug) {
    console.log('[email-change] Processing email change confirmation');
  }

  if (!token_hash) {
    if (debug) console.error('[email-change] missing token_hash');
    return NextResponse.redirect(new URL(`/settings/account?emailUpdateError=missing_token`, url.origin));
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (error) {
      if (debug) console.error('[email-change] verifyOtp error:', error);
      return NextResponse.redirect(new URL(`/settings/account?emailUpdateError=link_invalid_or_expired`, url.origin));
    }

    if (debug) console.log('[email-change] Email verification successful for user:', data?.user?.id);

    // Sync profiles.email to the now-updated auth email
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && user.email) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: user.email })
        .eq('id', user.id);

      if (profileError) {
        if (debug) console.error('[email-change] Failed to sync profile email:', profileError.message);
        // Don't fail the flow, just log the error
      } else {
        if (debug) console.log('[email-change] Profile email synced successfully');
      }
    }

    if (debug) console.log('[email-change] Success for user', user?.id, 'new email:', user?.email);
    return NextResponse.redirect(new URL(`${next}?emailUpdated=1`, url.origin));

  } catch (error) {
    if (debug) console.error('[email-change] Unexpected error:', error);
    return NextResponse.redirect(new URL(`/settings/account?emailUpdateError=link_invalid_or_expired`, url.origin));
  }
}