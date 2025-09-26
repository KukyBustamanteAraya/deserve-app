// src/app/onboarding/set-password/action/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateProfilePasswordFlag } from '@/lib/db/profiles';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const form = await req.formData();
  const password = String(form.get('password') || '');
  const confirm = String(form.get('confirm') || '');
  const rawNext = String(form.get('next') || '/dashboard');
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard';
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  if (debug) {
    console.log('[set-password] Processing password update, next:', next);
  }

  // Validate input
  if (password.length < 8) {
    const errorMessage = 'Password must be at least 8 characters long.';
    return NextResponse.redirect(
      new URL(`/onboarding/set-password?error=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  if (password !== confirm) {
    const errorMessage = 'Passwords do not match.';
    return NextResponse.redirect(
      new URL(`/onboarding/set-password?error=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  const supabase = createClient();

  // Verify user is authenticated (should be from magic link)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    if (debug) console.error('[set-password] No authenticated user:', userError?.message);
    return NextResponse.redirect(new URL('/login?error=please_log_in', url.origin));
  }

  try {
    // Set the password
    const { error: setPasswordError } = await supabase.auth.updateUser({ password });
    if (setPasswordError) {
      if (debug) console.error('[set-password] Failed to set password:', setPasswordError.message);
      const errorMessage = 'Could not set password, please try again.';
      return NextResponse.redirect(
        new URL(`/onboarding/set-password?error=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(next)}`, url.origin)
      );
    }

    // Mark metadata so we skip this page next time (keep for backward compatibility)
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { password_set: true }
    });
    if (metadataError) {
      if (debug) console.error('[set-password] Failed to update metadata:', metadataError.message);
      // Don't fail the flow if metadata update fails, just log it
    }

    // Also update the profiles table for more reliable tracking
    try {
      const { error: profileError } = await updateProfilePasswordFlag(true);
      if (profileError) {
        if (debug) console.error('[set-password] Failed to update profile has_password:', profileError.message);
        // Don't fail the flow if profile update fails, just log it
      } else {
        if (debug) console.log('[set-password] Profile has_password flag updated successfully');
      }
    } catch (profileUpdateError) {
      if (debug) console.error('[set-password] Unexpected error updating profile:', profileUpdateError);
    }

    if (debug) {
      console.log('[set-password] Password set successfully for user:', user.id);
      console.log('[analytics] auth_password_set for user:', user.id);
      console.log('[set-password] Redirecting to:', next);
    }

    return NextResponse.redirect(new URL(next, url.origin));

  } catch (error) {
    if (debug) console.error('[set-password] Unexpected error:', error);
    const errorMessage = 'An unexpected error occurred. Please try again.';
    return NextResponse.redirect(
      new URL(`/onboarding/set-password?error=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(next)}`, url.origin)
    );
  }
}