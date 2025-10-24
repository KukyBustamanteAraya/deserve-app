'use client';

import { useState, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { SIZES_WITH_XXXL } from '@/constants/sizing';

interface SizeAssignmentCardProps {
  subTeamId: string;
  institutionSlug: string;
  rosterSize: number;
  currentSizes: Record<string, number>;
  onAssignmentComplete: () => void;
}

// Import sizes from constants (includes XXXL notation for compatibility)
const SIZES = SIZES_WITH_XXXL;

export function SizeAssignmentCard({
  subTeamId,
  institutionSlug,
  rosterSize,
  currentSizes,
  onAssignmentComplete
}: SizeAssignmentCardProps) {
  const [distribution, setDistribution] = useState<Record<string, number>>(
    currentSizes || Object.fromEntries(SIZES.map(size => [size, 0]))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  const isValid = total === rosterSize;
  const difference = total - rosterSize;

  const handleSizeChange = useCallback((size: string, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0 || numValue > 200) return;

    setDistribution(prev => ({
      ...prev,
      [size]: numValue
    }));
    setError(null);
    setSuccess(false);
  }, []);

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  const generatePreview = useMemo((): Array<{ size: string; range: string }> => {
    const preview: Array<{ size: string; range: string }> = [];
    let currentIndex = 1;

    for (const size of SIZES) {
      const count = distribution[size] || 0;
      if (count > 0) {
        const start = currentIndex;
        const end = currentIndex + count - 1;
        preview.push({
          size,
          range: start === end ? `#${start}` : `#${start}-${end}`
        });
        currentIndex += count;
      }
    }

    return preview;
  }, [distribution]);

  const handleApply = useCallback(async () => {
    if (!isValid) {
      setError(`El total debe ser exactamente ${rosterSize} jugadores`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/institutions/${institutionSlug}/sub-teams/${subTeamId}/members/bulk-assign-sizes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sub_team_id: subTeamId,
            size_distribution: distribution
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign sizes');
      }

      logger.info('[Size Assignment] Successfully assigned sizes:', {
        updatedCount: data.updated_count,
        distribution
      });

      setSuccess(true);
      setTimeout(() => {
        onAssignmentComplete();
      }, 1500);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('[Size Assignment] Error:', toError(err));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isValid, rosterSize, institutionSlug, subTeamId, distribution, onAssignmentComplete]);

  return (
    <div className="relative bg-gradient-to-br from-purple-900/20 via-black/80 to-purple-800/20 backdrop-blur-md rounded-lg shadow-2xl border border-purple-500/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Asignación Rápida de Tallas</h3>
          <p className="text-sm text-gray-400">
            Distribuye las tallas entre los {rosterSize} jugadores del roster. Los jugadores se asignarán secuencialmente por número de jersey.
          </p>
        </div>

        {/* Size Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {SIZES.map((size) => (
            <div key={size} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Talla {size}
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={distribution[size] || ''}
                onChange={(e) => handleSizeChange(size, e.target.value)}
                onFocus={handleInputFocus}
                placeholder="0"
                className="w-full bg-gray-900/50 border border-gray-600 rounded px-3 py-2 text-white text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className={`p-4 rounded-lg mb-6 border ${
          isValid
            ? 'bg-green-900/20 border-green-500/30'
            : 'bg-orange-900/20 border-orange-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Total Asignado</div>
              <div className={`text-2xl font-bold ${
                isValid ? 'text-green-400' : 'text-orange-400'
              }`}>
                {total} / {rosterSize}
              </div>
            </div>
            {!isValid && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Diferencia</div>
                <div className={`text-xl font-bold ${
                  difference > 0 ? 'text-red-400' : 'text-orange-400'
                }`}>
                  {difference > 0 ? '+' : ''}{difference}
                </div>
              </div>
            )}
            {isValid && (
              <div className="text-green-400 text-3xl">✓</div>
            )}
          </div>
        </div>

        {/* Preview */}
        {generatePreview.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-300 mb-3">Vista Previa de Asignación</h4>
            <div className="flex flex-wrap gap-2">
              {generatePreview.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800/50 rounded px-3 py-1.5 border border-gray-700"
                >
                  <span className="text-xs text-gray-400">Talla {item.size}: </span>
                  <span className="text-sm font-semibold text-white">{item.range}</span>
                </div>
              ))}
            </div>
            {!isValid && (
              <p className="text-xs text-orange-400 mt-3">
                Ajusta las cantidades para ver la asignación completa
              </p>
            )}
          </div>
        )}

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
              <p className="text-sm text-green-300">Tallas asignadas exitosamente</p>
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApply}
          disabled={!isValid || isLoading || success}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            isValid && !isLoading && !success
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-purple-500/50'
              : 'bg-gray-700 cursor-not-allowed opacity-50'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Aplicando...
            </span>
          ) : success ? (
            '¡Completado!'
          ) : (
            'Aplicar Tallas al Roster'
          )}
        </button>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Las tallas se asignarán a los jugadores en orden secuencial según su número de jersey
        </p>
      </div>
    </div>
  );
}
