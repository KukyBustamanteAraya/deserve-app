import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { siteOrigin } from '@/utils/url';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const form = await req.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const next = '/settings/account'; // after confirming, we'll return here
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  if (debug) {
    console.log('[settings/email] Processing email update request');
  }

  const supabase = createClient();

  // Verify user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    if (debug) console.error('[settings/email] No authenticated user:', userError?.message);
    // Always redirect with neutral banner (avoid info leakage)
    const dest = new URL('/settings/account?emailUpdateSent=1', url.origin);
    return NextResponse.redirect(dest);
  }

  // Validate email format
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    if (debug) console.error('[settings/email] Invalid email format:', email);
    // Always redirect with neutral banner (avoid info leakage)
    const dest = new URL('/settings/account?emailUpdateSent=1', url.origin);
    return NextResponse.redirect(dest);
  }

  try {
    // Trigger change-email flow; Supabase sends confirmation to the NEW email
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${siteOrigin()}/auth/email-change?next=${encodeURIComponent(next)}` }
    );

    if (debug) {
      if (error) {
        console.error('[settings/email] Failed to send email update:', error.message);
      } else {
        console.log('[settings/email] Email update initiated for user:', user.id, 'new email:', email);
      }
    }

    // Always redirect with neutral banner (avoid info leakage)
    const dest = new URL('/settings/account?emailUpdateSent=1', url.origin);
    return NextResponse.redirect(dest);

  } catch (error) {
    if (debug) console.error('[settings/email] Unexpected error:', error);
    // Always redirect with neutral banner (avoid info leakage)
    const dest = new URL('/settings/account?emailUpdateSent=1', url.origin);
    return NextResponse.redirect(dest);
  }
}