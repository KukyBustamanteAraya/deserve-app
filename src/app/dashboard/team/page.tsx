import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamCreateFormNew } from './TeamCreateFormNew';
import { createTeamAction } from './actions';
import { TeamListClient } from './TeamListClient';

export default async function TeamPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/team');

  // Fetch user's teams (including colors)
  const { data: userTeams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, slug, sport_id, created_at, colors, logo_url, sports(name)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  // Ensure userTeams is always an array
  const teams = userTeams || [];

  const { data: sports = [] } = await supabase
    .from('sports')
    .select('slug,name')
    .order('name', { ascending: true });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Team Management</h1>

      {/* Display existing teams */}
      {teams.length > 0 && <TeamListClient teams={teams} />}

      {/* Create new team form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
        <TeamCreateFormNew sports={sports ?? []} action={createTeamAction} />
      </div>
    </div>
  );
}
