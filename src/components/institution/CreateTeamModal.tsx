'use client';

import { useState } from 'react';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionSlug: string;
  sportId: number;
  sportName: string;
  onSuccess?: () => void;
}

export function CreateTeamModal({
  isOpen,
  onClose,
  institutionSlug,
  sportId,
  sportName,
  onSuccess,
}: CreateTeamModalProps) {
  const [teamName, setTeamName] = useState('');
  const [genderCategory, setGenderCategory] = useState<'male' | 'female' | 'both'>('male');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const slug = `${teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-4)}`;

      const response = await fetch(`/api/institutions/${institutionSlug}/sub-teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
          slug,
          sport_id: sportId,
          gender_category: genderCategory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }

      // Success!
      setTeamName('');
      setGenderCategory('male');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.message || 'Error al crear equipo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 pr-8">Crear Nuevo Equipo</h2>
        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">Agregar un equipo al programa de {sportName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Equipo *
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="ej: Varsity, JV, U-17..."
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-[#e21c21] focus:ring-1 focus:ring-[#e21c21] outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categoría de Género *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Male Button */}
              <button
                type="button"
                onClick={() => setGenderCategory('male')}
                className={`relative px-2 py-2 sm:px-4 sm:py-3 rounded-lg border transition-all overflow-hidden group ${
                  genderCategory === 'male'
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="10" cy="14" r="6" />
                    <path d="M16 8l6-6m0 0h-5m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-medium">Hombres</span>
                </div>
              </button>

              {/* Female Button */}
              <button
                type="button"
                onClick={() => setGenderCategory('female')}
                className={`relative px-2 py-2 sm:px-4 sm:py-3 rounded-lg border transition-all overflow-hidden group ${
                  genderCategory === 'female'
                    ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="8" r="6" />
                    <path d="M12 14v8m-3-3h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-medium">Mujeres</span>
                </div>
              </button>

              {/* Both Button */}
              <button
                type="button"
                onClick={() => setGenderCategory('both')}
                className={`relative px-2 py-2 sm:px-4 sm:py-3 rounded-lg border transition-all overflow-hidden group ${
                  genderCategory === 'both'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-medium">Ambos</span>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm sm:text-base font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-[#e21c21] hover:bg-[#c11a1e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm sm:text-base font-medium"
            >
              {loading ? 'Creando...' : 'Crear Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
