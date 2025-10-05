// POST /api/profile - Update user profile
import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseRouteClient,
  jsonWithCarriedCookies,
} from '@/lib/supabase/route';
import { createSupabaseServer } from '@/lib/supabase/server-client';

export async function POST(req: NextRequest) {
  const { supabase, response: carrier } = createSupabaseRouteClient(req);

  // Parse request body
  let body: { display_name?: string | null; avatar_url?: string | null; bio?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonWithCarriedCookies(carrier, { error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalize: trim and coerce empty strings to null
  const normalize = (v?: string | null) =>
    (typeof v === 'string' ? v.trim() : v) || null;

  const updateData = {
    display_name: normalize(body.display_name),
    avatar_url: normalize(body.avatar_url),
    bio: normalize(body.bio),
  };

  // 1) Auth check
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    console.error('[profile] getUser error:', userErr);
    return jsonWithCarriedCookies(carrier, { error: 'Unauthorized' }, { status: 401 });
  }

  const userId = userData.user.id;
  console.log('[profile] User authenticated:', userId);
  console.log('[profile] Update data:', updateData);

  // 2) Update (RLS will allow only own row)
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('[profile] Update error:', {
      code: (error as any).code,
      message: error.message,
      hint: (error as any).hint,
      details: (error as any).details,
    });
    return jsonWithCarriedCookies(
      carrier,
      { error: error.message, code: (error as any).code, details: (error as any).details },
      { status: 400 }
    );
  }

  if (!data) {
    // This usually means the profile row didn't exist (fixed by backfill SQL)
    console.warn('[profile] No row updated for user:', userId);
    return jsonWithCarriedCookies(
      carrier,
      { error: 'Profile not found for current user.' },
      { status: 404 }
    );
  }

  console.log('[profile] Update successful for user:', userId);
  return jsonWithCarriedCookies(carrier, { ok: true, profile: data }, { status: 200 });
}

// GET /api/profile - Get current user profile
export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: profile,
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in profile fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}