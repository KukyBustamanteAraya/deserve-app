import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error('[DeleteAccount] No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('[DeleteAccount] Starting account deletion', { userId: user.id, email: user.email });

    // Create admin client to delete auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete related data first (CASCADE should handle most, but let's be explicit)
    try {
      // Delete player info submissions
      const { error: submissionsError } = await supabase
        .from('player_info_submissions')
        .delete()
        .eq('user_id', user.id);

      if (submissionsError) {
        logger.error('[DeleteAccount] Error deleting player submissions:', submissionsError);
      }

      // Delete team memberships
      const { error: membershipsError } = await supabase
        .from('team_memberships')
        .delete()
        .eq('user_id', user.id);

      if (membershipsError) {
        logger.error('[DeleteAccount] Error deleting team memberships:', membershipsError);
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        logger.error('[DeleteAccount] Error deleting profile:', toError(profileError));
      }

      logger.debug('[DeleteAccount] Cleaned up related data');
    } catch (cleanupError) {
      logger.error('[DeleteAccount] Error during data cleanup', toError(cleanupError));
      // Continue anyway - we still want to delete the auth user
    }

    // Delete the auth user (this will cascade delete via foreign keys)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error('[DeleteAccount] Failed to delete auth user:', toSupabaseError(deleteError));
      return NextResponse.json(
        { error: 'Failed to delete account', details: deleteError.message },
        { status: 500 }
      );
    }

    logger.info('[DeleteAccount] Account successfully deleted', { userId: user.id });

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json(
      { success: true, message: 'Account deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    logger.error('[DeleteAccount] Unexpected error:', toError(error));
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}
