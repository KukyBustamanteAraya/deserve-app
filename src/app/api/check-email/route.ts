// Check Email API - Verify if email exists in auth system
// Used by wizard to detect existing users before submission

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return apiError('Email is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError('Invalid email format', 400);
    }

    // Use service role to check if user exists
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingUsers, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      logger.error('Error checking users:', toError(error));
      return apiError('Failed to check email', 500);
    }

    const userExists = existingUsers.users.some(u => u.email === email);

    return apiSuccess({
      exists: userExists,
      email: email,
    });

  } catch (error) {
    logger.error('Error in check-email:', toError(error));
    return apiError('An unexpected error occurred', 500);
  }
}

// Disable other methods
export async function GET() {
  return apiError('Method not allowed', 405);
}
