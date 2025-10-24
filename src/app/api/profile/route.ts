// POST /api/profile - Update user profile
import { NextRequest } from 'next/server';
import {
  createSupabaseRouteClient,
  jsonWithCarriedCookies,
} from '@/lib/supabase/route';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const { supabase, response: carrier } = createSupabaseRouteClient(req);

  // Parse request body
  let body: { full_name?: string | null; avatar_url?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonWithCarriedCookies(carrier, { error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalize: trim and coerce empty strings to null
  const normalize = (v?: string | null) =>
    (typeof v === 'string' ? v.trim() : v) || null;

  const updateData: Record<string, any> = {};

  // Only include fields that are provided
  if (body.full_name !== undefined) {
    updateData.full_name = normalize(body.full_name);
  }
  if (body.avatar_url !== undefined) {
    updateData.avatar_url = normalize(body.avatar_url);
  }

  // 1) Auth check
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    logger.error('[profile] getUser error', toError(userErr));
    return jsonWithCarriedCookies(carrier, { error: 'Unauthorized' }, { status: 401 });
  }

  const userId = userData.user.id;
  logger.debug('[profile] User authenticated:', { userId });
  logger.debug('[profile] Update data:', { updateData });

  // 2) Update (RLS will allow only own row)
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    logger.error('[profile] Update error:', {
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
    logger.warn('[profile] No row updated for user:', { userId });
    return jsonWithCarriedCookies(
      carrier,
      { error: 'Profile not found for current user.' },
      { status: 404 }
    );
  }

  logger.debug('[profile] Update successful for user:', { userId });
  return jsonWithCarriedCookies(carrier, { ok: true, profile: data }, { status: 200 });
}

// GET /api/profile - Get current user profile
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized();
    }

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching profile:', toError(error));
      return apiError('Failed to fetch profile', 500);
    }

    return apiSuccess(profile, 'Profile retrieved successfully');

  } catch (error) {
    logger.error('Unexpected error in profile fetch:', toError(error));
    return apiError('Internal server error');
  }
}