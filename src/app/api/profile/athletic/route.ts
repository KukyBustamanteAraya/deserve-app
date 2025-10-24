// PATCH /api/profile/athletic - Update athletic profile
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';
import { z } from 'zod';
import { EXTENDED_SIZES } from '@/constants/sizing';

// Athletic profile validation schema
const athleticProfileSchema = z.object({
  sports: z.array(z.string()).optional(),
  primary_sport: z.string().optional(),
  default_size: z.enum(EXTENDED_SIZES).optional(), // Import from constants
  default_positions: z.array(z.string()).optional(),
  preferred_jersey_number: z.string().max(3).optional(),
  fabric_preferences: z.object({
    breathability: z.enum(['standard', 'high']).optional(),
    fit: z.enum(['regular', 'slim', 'relaxed']).optional(),
  }).optional(),
  measurements: z.object({
    height_cm: z.number().min(100).max(250).optional(),
    weight_kg: z.number().min(30).max(200).optional(),
    chest_cm: z.number().min(50).max(150).optional(),
  }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body = await request.json();
    const validation = athleticProfileSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.issues[0];
      return apiValidationError(`Invalid athletic profile: ${error.message}`);
    }

    // Get current athletic profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('athletic_profile, user_type')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching current profile:', toSupabaseError(fetchError));
      return apiError('Failed to fetch profile', 500);
    }

    // Check if user_type is appropriate for athletic profile
    const userType = currentProfile.user_type;
    if (userType && !['player', 'hybrid'].includes(userType)) {
      logger.warn(`User ${user.id} with type ${userType} attempting to set athletic profile`);
      // Allow it but log warning - users might want to switch types
    }

    // Merge with existing athletic profile (don't overwrite entire object)
    const currentAthletic = currentProfile.athletic_profile || {};
    const updatedAthletic = {
      ...currentAthletic,
      ...validation.data,
    };

    // Update athletic profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ athletic_profile: updatedAthletic })
      .eq('id', user.id)
      .select('athletic_profile')
      .single();

    if (updateError) {
      logger.error('Error updating athletic profile:', toSupabaseError(updateError));
      return apiError('Failed to update athletic profile', 500);
    }

    logger.info(`User ${user.id} updated athletic profile`);

    return apiSuccess(
      { athletic_profile: updatedProfile.athletic_profile },
      'Athletic profile updated successfully'
    );

  } catch (error) {
    logger.error('Unexpected error updating athletic profile:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// GET /api/profile/athletic - Get current athletic profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('athletic_profile')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching athletic profile:', toError(error));
      return apiError('Failed to fetch athletic profile', 500);
    }

    return apiSuccess({ athletic_profile: profile.athletic_profile || {} });

  } catch (error) {
    logger.error('Unexpected error fetching athletic profile:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// DELETE /api/profile/athletic - Clear athletic profile
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Reset to empty object
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ athletic_profile: {} })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Error clearing athletic profile:', toSupabaseError(updateError));
      return apiError('Failed to clear athletic profile', 500);
    }

    logger.info(`User ${user.id} cleared athletic profile`);

    return apiSuccess(null, 'Athletic profile cleared successfully');

  } catch (error) {
    logger.error('Unexpected error clearing athletic profile:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// Explicitly disable other methods
export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}
