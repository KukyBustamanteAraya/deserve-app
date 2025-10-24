// PATCH /api/profile/user-type - Update user type classification
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema
const userTypeSchema = z.object({
  user_type: z.enum(['player', 'manager', 'athletic_director', 'hybrid']),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body = await request.json();
    const validation = userTypeSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.issues[0];
      return apiValidationError(`Invalid user_type: ${error.message}`);
    }

    const { user_type } = validation.data;

    // Update user type
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ user_type })
      .eq('id', user.id)
      .select('id, user_type, full_name')
      .single();

    if (updateError) {
      logger.error('Error updating user type:', toSupabaseError(updateError));
      return apiError('Failed to update user type', 500);
    }

    logger.info(`User ${user.id} updated user_type to: ${user_type}`);

    return apiSuccess(
      { user_type: updatedProfile.user_type },
      'User type updated successfully'
    );

  } catch (error) {
    logger.error('Unexpected error in user-type update:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// GET /api/profile/user-type - Get current user type
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching user type:', toError(error));
      return apiError('Failed to fetch user type', 500);
    }

    return apiSuccess({ user_type: profile.user_type || null });

  } catch (error) {
    logger.error('Unexpected error fetching user type:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// Explicitly disable other methods
export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}
