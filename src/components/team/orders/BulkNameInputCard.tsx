'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface RosterMember {
  id: string;
  player_name: string;
  jersey_number: number;
}

interface BulkNameInputCardProps {
  subTeamId: string;
  institutionSlug: string;
  rosterMembers: RosterMember[];
  onUpdateComplete: () => void;
}

export function BulkNameInputCard({
  subTeamId,
  institutionSlug,
  rosterMembers,
  onUpdateComplete
}: BulkNameInputCardProps) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize names from roster members
  useEffect(() => {
    const initialNames: Record<string, string> = {};
    rosterMembers.forEach(member => {
      initialNames[member.id] = member.player_name;
    });
    setNames(initialNames);
    logger.info('[Bulk Names] Initialized names from roster:', {
      count: rosterMembers.length,
      sample: rosterMembers.slice(0, 3).map(m => ({ id: m.id, name: m.player_name }))
    });
  }, [rosterMembers]);

  const handleNameChange = useCallback((memberId: string, value: string) => {
    setNames(prev => ({
      ...prev,
      [memberId]: value
    }));
    setError(null);
    setSuccess(false);
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      const newNames: Record<string, string> = { ...names };
      rosterMembers.forEach((member, index) => {
        if (index < lines.length && lines[index]) {
          newNames[member.id] = lines[index].substring(0, 50); // Enforce max length
        }
      });

      setNames(newNames);
      logger.info('[Bulk Names] Pasted names from clipboard:', { count: lines.length });
    } catch (err) {
      logger.error('[Bulk Names] Clipboard error:', toError(err));
      setError('No se pudo leer del portapapeles');
    }
  }, [names, rosterMembers]);

  const handleClearAll = useCallback(() => {
    const clearedNames: Record<string, string> = {};
    rosterMembers.forEach((member, index) => {
      clearedNames[member.id] = `Player ${index + 1}`;
    });
    setNames(clearedNames);
  }, [rosterMembers]);

  const handleApply = useCallback(async () => {
    // Build updates array
    const updates = rosterMembers.map(member => ({
      member_id: member.id,
      player_name: names[member.id]?.trim() || member.player_name
    }));

    logger.info('[Bulk Names] Sending updates to API:', {
      count: updates.length,
      sample: updates.slice(0, 3)
    });

    // Check for empty names
    const emptyNames = updates.filter(u => !u.player_name || u.player_name.length === 0);
    if (emptyNames.length > 0) {
      setError('Todos los jugadores deben tener un nombre');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/institutions/${institutionSlug}/sub-teams/${subTeamId}/members/bulk-update-names`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update names');
      }

      logger.info('[Bulk Names] Successfully updated:', {
        count: data.updated_count
      });

      setSuccess(true);

      // Immediately trigger refresh
      onUpdateComplete();

      // Hide success message after delay
      setTimeout(() => {
        setSuccess(false);
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('[Bulk Names] Error:', toError(err));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [rosterMembers, names, institutionSlug, subTeamId, onUpdateComplete]);

  const filledCount = useMemo(() =>
    Object.values(names).filter(name =>
      name && name.trim().length > 0 && !name.startsWith('Player ')
    ).length
  , [names]);

  return (
    <div className="relative bg-gradient-to-br from-green-900/20 via-black/80 to-green-800/20 backdrop-blur-md rounded-lg shadow-2xl border border-green-500/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl">✏️</span>
          <div>
            <h3 className="text-xl font-bold text-white">Asignar Nombres de Jugadores</h3>
            <p className="text-sm text-gray-400 mt-1">
              Ingresa los nombres que aparecerán en las camisetas. Los jugadores están ordenados por número de jersey.
            </p>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700 mb-6 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 p-3 bg-gray-900/50 border-b border-gray-700">
            <div className="col-span-1 text-xs font-semibold text-gray-400 uppercase">#</div>
            <div className="col-span-5 text-xs font-semibold text-gray-400 uppercase">Jugador Actual</div>
            <div className="col-span-6 text-xs font-semibold text-gray-400 uppercase">Nuevo Nombre</div>
          </div>

          {/* Table Body - Scrollable */}
          <div className="max-h-96 overflow-y-auto">
            {rosterMembers.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-12 gap-3 p-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors"
              >
                <div className="col-span-1 text-sm text-gray-300 flex items-center font-semibold">
                  {member.jersey_number}
                </div>
                <div className="col-span-5 text-sm text-gray-400 flex items-center truncate">
                  {member.player_name}
                </div>
                <div className="col-span-6 flex items-center">
                  <input
                    type="text"
                    value={names[member.id] || ''}
                    onChange={(e) => handleNameChange(member.id, e.target.value)}
                    maxLength={50}
                    placeholder="Ingresa nombre..."
                    className="w-full bg-gray-900/50 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handlePasteFromClipboard}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600/80 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📋</span>
            <span>Pegar desde Excel</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-600/80 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar Todo
          </button>
        </div>

        {/* Progress */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Progreso:</span>
            <span className="text-lg font-bold text-blue-400">
              {filledCount} / {rosterMembers.length} nombres ingresados
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(filledCount / rosterMembers.length) * 100}%` }}
            ></div>
          </div>
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
              <p className="text-sm text-green-300">Nombres actualizados exitosamente</p>
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApply}
          disabled={isLoading || success}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            !isLoading && !success
              ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-green-500/50'
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
            'Aplicar Nombres al Roster'
          )}
        </button>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Tip: Puedes copiar una columna de Excel y usar &quot;Pegar desde Excel&quot; para importar múltiples nombres a la vez
        </p>
      </div>
    </div>
  );
}
