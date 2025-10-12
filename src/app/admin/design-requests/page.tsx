import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DesignRequestsClient from './DesignRequestsClient';
import { logger } from '@/lib/logger';

export default async function AdminDesignRequestsPage() {
  try {
    await requireAdmin();

    const supabase = createSupabaseServer();
    const supabaseService = createSupabaseServiceClient();

    // Fetch all design requests with related data
    const { data: requests, error } = await supabase
      .from('design_requests')
      .select(`
        *,
        teams!design_requests_team_slug_fkey (
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching design requests:', error);
      throw new Error('Failed to fetch design requests');
    }

    // Get user emails separately from auth.users
    if (requests && requests.length > 0) {
      const userIds = [...new Set(requests.map(r => r.user_id))];
      logger.debug('Fetching emails for user IDs:', userIds);

      // Get emails from auth.users using admin API (requires service role)
      const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers();

      if (authError) {
        logger.error('Error fetching auth users:', authError);
      } else {
        logger.debug('Fetched auth users count:', authData?.users?.length || 0);
      }

      // Create a map of user_id -> email
      const userEmailMap = new Map(
        authData?.users
          ?.filter(u => userIds.includes(u.id))
          .map(u => [u.id, u.email || 'No email']) || []
      );

      logger.debug('User email map size:', userEmailMap.size);
      logger.debug('Sample emails:', Array.from(userEmailMap.entries()).slice(0, 3));

      // Get additional profile data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map user data to requests
      requests.forEach((request: any) => {
        const profile = profileMap.get(request.user_id);
        const email = userEmailMap.get(request.user_id);
        request.profiles = {
          id: request.user_id,
          email: email || 'Unknown',
          full_name: profile?.full_name || null,
          display_name: profile?.display_name || null
        };
      });

      logger.debug('Design requests with user data:', requests.slice(0, 3).map(r => ({
        id: r.id,
        user_id: r.user_id,
        user_email: r.profiles?.email
      })));
    }

    return (
      <DesignRequestsClient
        initialRequests={requests as any}
      />
    );

  } catch (error) {
    logger.error('Admin design requests page error:', error);
    redirect('/dashboard?error=admin_required');
  }
}

export const metadata = {
  title: 'Design Requests | Admin',
  description: 'Manage customer design requests.',
};
