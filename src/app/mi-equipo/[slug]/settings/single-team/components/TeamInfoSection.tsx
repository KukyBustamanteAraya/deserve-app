'use client';

import { getSportInfo } from '@/lib/sports/sportsMapping';

interface Team {
  id: string;
  slug: string;
  name: string;
  sport?: string;
  team_type?: 'single_team' | 'institution';
  institution_name?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  owner_id: string;
  current_owner_id: string;
}

interface Sport {
  id: string;
  name: string;
  slug: string;
}

interface TeamInfoSectionProps {
  team: Team;
  sports: Sport[];
  sportsLoading: boolean;
  onTeamChange: (updates: Partial<Team>) => void;
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
}

export function TeamInfoSection({
  team,
  sports,
  sportsLoading,
  onTeamChange,
  onUpdateTeamInfo
}: TeamInfoSectionProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4 relative">Team Information</h2>
      <p className="text-gray-300 text-sm mb-4 relative">Basic team details</p>

      <div className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Team Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={team.name}
              onChange={(e) => onTeamChange({ name: e.target.value })}
              className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            />
            <button
              onClick={() => onUpdateTeamInfo('name', team.name)}
              className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Update</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Sport
          </label>
          <div className="flex gap-2">
            <select
              value={team.sport || ''}
              onChange={(e) => onTeamChange({ sport: e.target.value })}
              className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
              disabled={sportsLoading}
            >
              <option value="" className="bg-black text-white">Select a sport</option>
              {sports.map((sport) => {
                const sportInfo = getSportInfo(sport.slug);
                return (
                  <option key={sport.id} value={sport.slug} className="bg-black text-white">
                    {sportInfo.emoji} {sport.name}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => onUpdateTeamInfo('sport', team.sport || '')}
              className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              disabled={sportsLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Update</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Sets the sport for field visualization and available positions
          </p>
        </div>
      </div>
    </div>
  );
}
