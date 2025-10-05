'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteTeamAction(teamId: string) {
  const supabase = createSupabaseServerClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify the team exists and user is the creator
  const { data: team, error: fetchError } = await supabase
    .from('teams')
    .select('id, created_by')
    .eq('id', teamId)
    .single();

  if (fetchError || !team) {
    return { success: false, error: 'Team not found' };
  }

  if (team.created_by !== user.id) {
    return { success: false, error: 'Only the team creator can delete this team' };
  }

  // Delete the team (cascade will handle team_members)
  const { error: deleteError } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Revalidate and redirect
  revalidatePath('/dashboard/team');
  redirect('/dashboard/team');
}
