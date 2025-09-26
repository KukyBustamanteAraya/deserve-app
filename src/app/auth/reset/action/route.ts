// src/app/auth/reset/action/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { siteOrigin } from '@/utils/url';

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get('password') || '').trim();
  const confirm = String(form.get('confirm') || '').trim();
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  if (debug) {
    console.log('[reset-password] Processing password reset request');
  }

  // Validate input
  if (password.length < 8) {
    const errorMessage = 'Password must be at least 8 characters long.';
    return NextResponse.redirect(
      new URL(`/auth/reset?error=${encodeURIComponent(errorMessage)}`, siteOrigin())
    );
  }

  if (password !== confirm) {
    const errorMessage = 'Passwords do not match.';
    return NextResponse.redirect(
      new URL(`/auth/reset?error=${encodeURIComponent(errorMessage)}`, siteOrigin())
    );
  }

  const supabase = createClient();

  // Verify user is authenticated (should be from password reset email)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    if (debug) console.error('[reset-password] No authenticated user:', userError?.message);
    const errorMessage = 'Your password reset link has expired. Please request a new one.';
    return NextResponse.redirect(
      new URL(`/auth/forgot?error=${encodeURIComponent(errorMessage)}`, siteOrigin())
    );
  }

  try {
    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      if (debug) console.error('[reset-password] Failed to update password:', updateError.message);
      const errorMessage = 'Could not update password, please try again.';
      return NextResponse.redirect(
        new URL(`/auth/reset?error=${encodeURIComponent(errorMessage)}`, siteOrigin())
      );
    }

    // Mark password as set in metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { password_set: true }
    });
    if (metadataError) {
      if (debug) console.error('[reset-password] Failed to update metadata:', metadataError.message);
      // Don't fail the flow if metadata update fails, just log it
    }

    if (debug) {
      console.log('[reset-password] Password reset successfully for user:', user.id);
    }

    return NextResponse.redirect(new URL('/auth/reset?success=1', siteOrigin()));

  } catch (error) {
    if (debug) console.error('[reset-password] Unexpected error:', error);
    const errorMessage = 'An unexpected error occurred. Please try again.';
    return NextResponse.redirect(
      new URL(`/auth/reset?error=${encodeURIComponent(errorMessage)}`, siteOrigin())
    );
  }
}