import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateMyProfile } from '@/lib/db/profiles';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const form = await req.formData();
  const fullName = String(form.get('full_name') || '').trim();
  const debug = process.env.DEBUG_AUTH_LOGS === '1';

  if (debug) {
    console.log('[settings/name] Processing name update');
  }

  const supabase = createClient();

  // Verify user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    if (debug) console.error('[settings/name] No authenticated user:', userError?.message);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Update the profile using our helper function
    const { data, error } = await updateMyProfile({
      full_name: fullName
    });

    if (error) {
      if (debug) console.error('[settings/name] Failed to update profile:', error.message);
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
    }

    if (debug) {
      console.log('[settings/name] Name updated successfully for user:', user.id);
    }

    return NextResponse.json({
      success: true,
      data: { full_name: data?.full_name }
    });

  } catch (error) {
    if (debug) console.error('[settings/name] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}