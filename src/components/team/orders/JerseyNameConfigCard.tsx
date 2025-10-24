'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface JerseyNameConfigCardProps {
  subTeamId: string;
  institutionSlug: string;
  currentStyle: 'player_name' | 'team_name' | 'none' | null;
  currentTeamName: string | null;
  onConfigUpdate: () => void;
}

type JerseyNameStyle = 'player_name' | 'team_name' | 'none';

export function JerseyNameConfigCard({
  subTeamId,
  institutionSlug,
  currentStyle,
  currentTeamName,
  onConfigUpdate
}: JerseyNameConfigCardProps) {
  const [selectedStyle, setSelectedStyle] = useState<JerseyNameStyle>(
    currentStyle || 'player_name'
  );
  const [teamName, setTeamName] = useState(currentTeamName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelectedStyle(currentStyle || 'player_name');
    setTeamName(currentTeamName || '');
  }, [currentStyle, currentTeamName]);

  const handleStyleChange = useCallback((style: JerseyNameStyle) => {
    setSelectedStyle(style);
    setError(null);
    setSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    // Validate team name if required
    if (selectedStyle === 'team_name' && !teamName.trim()) {
      setError('Por favor ingresa el nombre del equipo');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/institutions/${institutionSlug}/sub-teams/${subTeamId}/jersey-config`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jersey_name_style: selectedStyle,
            jersey_team_name: selectedStyle === 'team_name' ? teamName.trim() : undefined
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      logger.info('[Jersey Config] Successfully updated:', data);
      setSuccess(true);

      setTimeout(() => {
        onConfigUpdate();
        setSuccess(false);
      }, 1500);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('[Jersey Config] Error:', toError(err));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStyle, teamName, institutionSlug, subTeamId, onConfigUpdate]);

  return (
    <div className="relative bg-gradient-to-br from-orange-900/20 via-black/80 to-orange-800/20 backdrop-blur-md rounded-lg shadow-2xl border border-orange-500/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl">🎽</span>
          <div>
            <h3 className="text-xl font-bold text-white">Configuración de Nombres en Camisetas</h3>
            <p className="text-sm text-gray-400 mt-1">
              Elige cómo aparecerán los nombres en las camisetas del equipo
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6">
          {/* Option 1: Player Names */}
          <label
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedStyle === 'player_name'
                ? 'bg-orange-900/30 border-orange-500'
                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name="jersey_style"
              value="player_name"
              checked={selectedStyle === 'player_name'}
              onChange={() => handleStyleChange('player_name')}
              className="mt-1 w-4 h-4 text-orange-500"
              disabled={isLoading}
            />
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">Nombres de Jugadores</div>
              <div className="text-sm text-gray-400">
                Cada jugador tendrá su nombre personalizado en la camiseta
              </div>
            </div>
          </label>

          {/* Option 2: Team Name */}
          <label
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedStyle === 'team_name'
                ? 'bg-orange-900/30 border-orange-500'
                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name="jersey_style"
              value="team_name"
              checked={selectedStyle === 'team_name'}
              onChange={() => handleStyleChange('team_name')}
              className="mt-1 w-4 h-4 text-orange-500"
              disabled={isLoading}
            />
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">Nombre del Equipo</div>
              <div className="text-sm text-gray-400 mb-3">
                Todas las camisetas tendrán el mismo nombre del equipo
              </div>
              {selectedStyle === 'team_name' && (
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                  placeholder="Ej: WILDCATS"
                  maxLength={50}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded px-3 py-2 text-white uppercase placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isLoading}
                />
              )}
            </div>
          </label>

          {/* Option 3: No Names */}
          <label
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedStyle === 'none'
                ? 'bg-orange-900/30 border-orange-500'
                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name="jersey_style"
              value="none"
              checked={selectedStyle === 'none'}
              onChange={() => handleStyleChange('none')}
              className="mt-1 w-4 h-4 text-orange-500"
              disabled={isLoading}
            />
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">Sin Nombres</div>
              <div className="text-sm text-gray-400">
                Solo números de jersey, sin nombres en las camisetas
              </div>
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xl">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xl">✓</span>
              <p className="text-sm text-green-300">Configuración guardada exitosamente</p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading || success}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            !isLoading && !success
              ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-orange-500/50'
              : 'bg-gray-700 cursor-not-allowed opacity-50'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </span>
          ) : success ? (
            '¡Guardado!'
          ) : (
            'Guardar Configuración'
          )}
        </button>
      </div>
    </div>
  );
}
