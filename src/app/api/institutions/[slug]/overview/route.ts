import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    logger.info(`[Overview API] Fetching institution overview for slug: "${slug}"`);
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('[Overview API] Authentication failed:', toError(authError));
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info(`[Overview API] User authenticated: ${user.id}`);

    // Fetch institution team by slug
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      logger.error(`[Overview API] Institution not found for slug "${slug}":`, toError(teamError));
      logger.error('[Overview API] Error details:', { code: (teamError as any)?.code, message: (teamError as any)?.message, details: (teamError as any)?.details });
      return NextResponse.json(
        { error: 'Institution not found' },
        { status: 404 }
      );
    }

    logger.info(`[Overview API] Institution found: ${institution.name} (ID: ${institution.id}, Type: ${institution.team_type})`);

    // Verify user has access to this institution
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role, institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch sub-teams (programs) count and list
    const { data: subTeams, error: subTeamsError } = await supabase
      .from('institution_sub_teams')
      .select('id, name, slug, sport_id, level, active, gender_category, sports(name, slug)')
      .eq('institution_team_id', institution.id)
      .eq('active', true)
      .order('name');

    if (subTeamsError) {
      logger.error('[Overview API] Error fetching sub-teams:', subTeamsError);
    }

    // Fetch total members count across all sub-teams
    const { count: membersCount, error: membersError } = await supabase
      .from('institution_sub_team_members')
      .select('id', { count: 'exact', head: true })
      .in('sub_team_id', (subTeams || []).map(st => st.id));

    if (membersError) {
      logger.error('Error counting members:', membersError);
    }

    // Fetch active orders count
    const { count: activeOrdersCount, error: ordersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', institution.id)
      .in('status', ['pending', 'paid', 'processing', 'shipped']);

    if (ordersError) {
      logger.error('Error counting orders:', ordersError);
    }

    // Fetch pending design requests count
    const { count: pendingApprovalsCount, error: designRequestsCountError } = await supabase
      .from('design_requests')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', institution.id)
      .in('status', ['pending', 'in_review', 'changes_requested', 'approved']);

    if (designRequestsCountError) {
      logger.error('Error counting design requests:', designRequestsCountError);
    }

    // Fetch active design requests with sub-team info for indicators
    const { data: designRequests, error: designRequestsError } = await supabase
      .from('design_requests')
      .select(`
        id,
        status,
        created_at,
        sub_team_id,
        design_id,
        primary_color,
        secondary_color,
        accent_color
      `)
      .eq('team_id', institution.id)
      .in('status', ['pending', 'in_review', 'changes_requested', 'approved'])
      .order('created_at', { ascending: false });

    if (designRequestsError) {
      logger.error('Error fetching design requests:', designRequestsError);
    }

    // Fetch institution settings
    const { data: settings, error: settingsError } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', institution.id)
      .single();

    if (settingsError) {
      logger.error('Error fetching settings:', settingsError);
    }

    // Return overview data (using camelCase to match frontend InstitutionStats interface)
    const responseData = {
      institution: {
        id: institution.id,
        name: institution.name,
        slug: institution.slug,
        institution_name: institution.institution_name,
        logo_url: institution.logo_url,
        colors: institution.colors,
        created_at: institution.created_at,
      },
      membership: {
        role: membership.role,
        institution_role: membership.institution_role,
      },
      stats: {
        totalMembers: membersCount || 0,
        totalAthletes: membersCount || 0, // Same as totalMembers
        totalPrograms: (subTeams || []).length,
        totalSports: (subTeams || []).length, // Same as totalPrograms
        activeOrders: activeOrdersCount || 0,
        pendingApprovals: pendingApprovalsCount || 0,
        incompleteOrders: 0, // TODO: Implement when we have this logic
        paymentCollected: 0, // TODO: Implement when we have payment tracking
        paymentTotal: 0, // TODO: Implement when we have payment tracking
      },
      programs: subTeams || [],
      design_requests: designRequests || [],
      settings: settings || null,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    logger.error('Error fetching institution overview:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
