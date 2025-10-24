// PATCH /api/profile/manager - Update manager profile
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';
import { z } from 'zod';

// Shipping address schema
const shippingAddressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  postal_code: z.string().optional(),
  country: z.string().default('Chile'),
  is_primary: z.boolean().default(false),
});

// Manager profile validation schema
const managerProfileSchema = z.object({
  organization_name: z.string().min(1).optional(),
  organization_type: z.enum(['school', 'club', 'university', 'pro', 'other']).optional(),
  shipping_addresses: z.array(shippingAddressSchema).optional(),
  billing_info: z.object({
    tax_id: z.string().optional(),
    billing_email: z.string().email().or(z.literal('')).optional(),
  }).optional(),
  primary_contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().or(z.literal('')).optional(),
  }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body = await request.json();
    const validation = managerProfileSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.issues[0];
      return apiValidationError(`Invalid manager profile: ${error.message}`);
    }

    // Get current manager profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('manager_profile, user_type')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching current profile:', toSupabaseError(fetchError));
      return apiError('Failed to fetch profile', 500);
    }

    // Check if user_type is appropriate for manager profile
    const userType = currentProfile.user_type;
    if (userType && !['manager', 'athletic_director', 'hybrid'].includes(userType)) {
      logger.warn(`User ${user.id} with type ${userType} attempting to set manager profile`);
      // Allow it but log warning - users might want to switch types
    }

    // Merge with existing manager profile
    const currentManager = currentProfile.manager_profile || {};
    const updatedManager = {
      ...currentManager,
      ...validation.data,
    };

    // Update manager profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ manager_profile: updatedManager })
      .eq('id', user.id)
      .select('manager_profile')
      .single();

    if (updateError) {
      logger.error('Error updating manager profile:', toSupabaseError(updateError));
      return apiError('Failed to update manager profile', 500);
    }

    logger.info(`User ${user.id} updated manager profile`);

    return apiSuccess(
      { manager_profile: updatedProfile.manager_profile },
      'Manager profile updated successfully'
    );

  } catch (error) {
    logger.error('Unexpected error updating manager profile:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// GET /api/profile/manager - Get current manager profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('manager_profile')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching manager profile:', toError(error));
      return apiError('Failed to fetch manager profile', 500);
    }

    return apiSuccess({ manager_profile: profile.manager_profile || {} });

  } catch (error) {
    logger.error('Unexpected error fetching manager profile:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// DELETE /api/profile/manager - Clear manager profile
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Reset to empty object
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ manager_profile: {} })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Error clearing manager profile:', toSupabaseError(updateError));
      return apiError('Failed to clear manager profile', 500);
    }

    logger.info(`User ${user.id} cleared manager profile`);

    return apiSuccess(null, 'Manager profile cleared successfully');

  } catch (error) {
    logger.error('Unexpected error clearing manager profile:', toError(error));
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
