// src/app/auth/forgot/action/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { siteOrigin } from '@/utils/url';

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get('email') || '').trim();
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  if (debug) {
    console.log('[forgot-password] Processing request for email:', email ? 'provided' : 'missing');
  }

  if (!email) {
    return NextResponse.redirect(
      new URL(`/auth/forgot?error=${encodeURIComponent('Enter your email')}`, siteOrigin())
    );
  }

  const supabase = createClient();

  try {
    // Send reset email. The email will contain a link to our "reset" route (type=recovery)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteOrigin()}/auth/reset`
    });

    if (debug) {
      console.log('[forgot-password] resetPasswordForEmail result:', {
        success: !error,
        error: error?.message
      });
    }

    // Always redirect to success state for security - don't reveal if email exists
    return NextResponse.redirect(new URL(`/auth/forgot?sent=1`, siteOrigin()));

  } catch (err) {
    if (debug) {
      console.error('[forgot-password] Unexpected error:', err);
    }

    // Generic message for security; don't reveal if email exists
    return NextResponse.redirect(new URL(`/auth/forgot?sent=1`, siteOrigin()));
  }
}