import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();

    const { userId, isAdmin } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update user's admin status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating admin status:', toSupabaseError(updateError));
      return NextResponse.json(
        { error: 'Failed to update admin status' },
        { status: 500 }
      );
    }

    logger.info(`Admin status ${isAdmin ? 'granted' : 'revoked'} for user ${userId}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Toggle admin POST error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
