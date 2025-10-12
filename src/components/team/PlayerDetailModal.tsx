'use client';

interface Player {
  id: string;
  player_name: string;
  jersey_number?: string;
  size: string;
  position?: string;
  additional_notes?: string;
  created_at?: string;
}

interface PlayerDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerDetailModal({ player, isOpen, onClose }: PlayerDetailModalProps) {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {player.jersey_number || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{player.player_name}</h2>
              {player.position && <p className="text-gray-600">{player.position}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Player Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Jersey Number</div>
              <div className="text-xl font-bold text-gray-900">{player.jersey_number || 'N/A'}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Size</div>
              <div className="text-xl font-bold text-gray-900">{player.size}</div>
            </div>
          </div>

          {player.position && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Position</div>
              <div className="text-lg font-semibold text-blue-900">{player.position}</div>
            </div>
          )}

          {player.additional_notes && (
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">Additional Notes</div>
              <div className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">
                {player.additional_notes}
              </div>
            </div>
          )}

          {player.created_at && (
            <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
              Added {new Date(player.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
