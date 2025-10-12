// Admin API to update design request status
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, status' },
        { status: 400 }
      );
    }

    // Update the design request status
    const { data: updated, error } = await supabase
      .from('design_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      logger.error('[Admin] Error updating design request:', error);
      return NextResponse.json(
        { error: 'Failed to update design request' },
        { status: 500 }
      );
    }

    logger.info(`[Admin] Updated design request ${requestId} to status: ${status}`);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('[Admin] Error:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
