import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TeamCreateFormNew } from './TeamCreateFormNew';
import { createTeamAction } from './actions';

export default async function TeamPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/team');

  // Fetch user's teams
  const { data: userTeams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, sport_id, created_at, sports(name)')
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
      {teams.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Your Teams</h2>
          <div className="space-y-2">
            {teams.map((team: any) => (
              <Link
                key={team.id}
                href={`/dashboard/team/${team.id}`}
                className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{team.name}</p>
                    <p className="text-sm text-gray-600">{team.sports?.name || 'Unknown Sport'}</p>
                    <p className="text-xs text-gray-400">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Create new team form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
        <TeamCreateFormNew sports={sports ?? []} action={createTeamAction} />
      </div>
    </div>
  );
}
