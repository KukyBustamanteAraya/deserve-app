import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch institution team by slug
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', params.slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      logger.error('Institution not found:', teamError);
      return NextResponse.json(
        { error: 'Institution not found' },
        { status: 404 }
      );
    }

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
      logger.error('Error fetching sub-teams:', subTeamsError);
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

    // Fetch institution settings
    const { data: settings, error: settingsError } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', institution.id)
      .single();

    if (settingsError) {
      logger.error('Error fetching settings:', settingsError);
    }

    // Return overview data
    return NextResponse.json({
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
        total_members: membersCount || 0,
        total_programs: (subTeams || []).length,
        active_orders: activeOrdersCount || 0,
      },
      programs: subTeams || [],
      settings: settings || null,
    });

  } catch (error) {
    logger.error('Error fetching institution overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
