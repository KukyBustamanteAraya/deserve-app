'use client';

import type { TeamSettings, AccessMode } from '@/types/team-settings';

interface AccessControlSectionProps {
  settings: TeamSettings;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
}

export function AccessControlSection({
  settings,
  onSettingsChange
}: AccessControlSectionProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4 relative">Access Control</h2>
      <p className="text-gray-300 text-sm mb-4 relative">Who can join your team</p>

      <div className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Access Mode
          </label>
          <select
            value={settings.access_mode}
            onChange={(e) => onSettingsChange({ access_mode: e.target.value as AccessMode })}
            className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
          >
            <option value="open" className="bg-black text-white">Open - Anyone can join</option>
            <option value="invite_only" className="bg-black text-white">Invite Only - Requires invitation</option>
            <option value="private" className="bg-black text-white">Private - Strictly controlled access</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.allow_member_invites}
            onChange={(e) => onSettingsChange({ allow_member_invites: e.target.checked })}
            className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
          />
          <label className="ml-2 text-sm text-gray-300">
            Allow team members to invite others
          </label>
        </div>
      </div>
    </div>
  );
}
