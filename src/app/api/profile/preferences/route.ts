// PATCH /api/profile/preferences - Update user preferences
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';
import { z } from 'zod';

// Preferences validation schema
const preferencesSchema = z.object({
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    order_updates: z.boolean().optional(),
    design_updates: z.boolean().optional(),
    team_updates: z.boolean().optional(),
  }).optional(),
  language: z.enum(['es', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  email_frequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body = await request.json();
    const validation = preferencesSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.issues[0];
      return apiValidationError(`Invalid preferences: ${error.message}`);
    }

    // Get current preferences
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching current preferences:', toSupabaseError(fetchError));
      return apiError('Failed to fetch preferences', 500);
    }

    // Merge with existing preferences (deep merge for nested objects)
    const currentPrefs = currentProfile.preferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      ...validation.data,
    };

    // Deep merge notifications if provided
    if (validation.data.notifications) {
      updatedPrefs.notifications = {
        ...(currentPrefs.notifications || {}),
        ...validation.data.notifications,
      };
    }

    // Update preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: updatedPrefs })
      .eq('id', user.id)
      .select('preferences')
      .single();

    if (updateError) {
      logger.error('Error updating preferences:', toSupabaseError(updateError));
      return apiError('Failed to update preferences', 500);
    }

    logger.info(`User ${user.id} updated preferences`);

    return apiSuccess(
      { preferences: updatedProfile.preferences },
      'Preferences updated successfully'
    );

  } catch (error) {
    logger.error('Unexpected error updating preferences:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// GET /api/profile/preferences - Get current preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching preferences:', toError(error));
      return apiError('Failed to fetch preferences', 500);
    }

    // Return preferences with defaults
    const preferences = profile.preferences || {
      notifications: {
        email: true,
        push: false,
        sms: false,
        order_updates: true,
        design_updates: true,
        team_updates: true,
      },
      language: 'es',
      theme: 'auto',
      email_frequency: 'instant',
    };

    return apiSuccess({ preferences });

  } catch (error) {
    logger.error('Unexpected error fetching preferences:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// DELETE /api/profile/preferences - Reset preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Reset to default preferences
    const defaultPreferences = {
      notifications: {
        email: true,
        push: false,
        sms: false,
        order_updates: true,
        design_updates: true,
        team_updates: true,
      },
      language: 'es',
      theme: 'auto',
      email_frequency: 'instant',
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: defaultPreferences })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Error resetting preferences:', toSupabaseError(updateError));
      return apiError('Failed to reset preferences', 500);
    }

    logger.info(`User ${user.id} reset preferences to defaults`);

    return apiSuccess(
      { preferences: defaultPreferences },
      'Preferences reset to defaults successfully'
    );

  } catch (error) {
    logger.error('Unexpected error resetting preferences:', toError(error));
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
