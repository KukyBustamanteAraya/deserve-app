import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { DeleteTeamButton } from './DeleteTeamButton';
import { TeamBanner } from './TeamBanner';

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/team');

  // Fetch team details
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, created_at, created_by, sports(name, slug)')
    .eq('id', params.teamId)
    .single();

  if (error || !team) {
    notFound();
  }

  // Check if user is the owner
  const isOwner = team.created_by === user.id;

  // Fetch team members from team_members table with profile data
  const { data: memberData } = await supabase
    .from('team_members')
    .select('user_id, role, profiles(id, full_name, email, avatar_url)')
    .eq('team_id', params.teamId);

  // Transform the data to flatten the profile information
  const members = memberData?.map((m: any) => ({
    id: m.user_id,
    role: m.role,
    full_name: m.profiles?.full_name,
    email: m.profiles?.email,
    avatar_url: m.profiles?.avatar_url,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard/team"
          className="text-sm text-blue-600 hover:text-blue-800 inline-block"
        >
          ← Back to Teams
        </Link>

        {/* Team Name Banner */}
        <TeamBanner teamName={team.name} isOwner={isOwner} />

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Members</p>
            <p className="text-3xl font-bold text-gray-900">{members.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Sport</p>
            <p className="text-xl font-semibold text-gray-900">{(team.sports as any)?.name}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-xl font-semibold text-green-600">Active</p>
          </div>
        </div>

        {/* Current Home Kit and Request Gear Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left - Current Home Kit */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Home Kit</h2>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">No kit selected</p>
                <p className="text-xs text-gray-500 mt-1">Request gear to get started</p>
              </div>
            </div>
          </div>

          {/* Right - Request New Gear Button */}
          <Link href={`/dashboard/team/${params.teamId}/request-gear`} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-center border-2 border-transparent hover:border-blue-500 group">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Request New Gear</h3>
              <p className="text-sm text-gray-600 mt-1">Add new equipment to your team</p>
            </div>
          </Link>
        </div>

        {/* Members Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
            {isOwner && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                Invite Members
              </button>
            )}
          </div>

          {members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name || 'Member'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {(member.full_name || member.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.full_name || 'Unknown'}
                        {member.id === team.created_by && (
                          <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  {isOwner && member.id !== team.created_by && (
                    <button className="text-red-600 hover:text-red-800 text-sm">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              No members yet. {isOwner && 'Invite some members to get started!'}
            </p>
          )}
        </div>

        {/* Team Settings (Owner Only) */}
        {isOwner && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  defaultValue={team.name}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Name editing coming soon</p>
              </div>

              <DeleteTeamButton teamId={team.id} teamName={team.name} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
