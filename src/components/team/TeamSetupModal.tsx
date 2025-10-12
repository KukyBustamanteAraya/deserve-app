'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';
import { useSports } from '@/hooks/api/useSports';
import { getSportInfo } from '@/lib/sports/sportsMapping';

interface TeamSetupModalProps {
  isOpen: boolean;
  onComplete: (data: TeamSetupData) => Promise<void>;
  preSelectedSport?: string; // For design request flow - pre-select sport
}

export interface TeamSetupData {
  teamType: 'single_team' | 'institution';
  sports: string[];
}

type Step = 'team_type' | 'sports';

/**
 * Simplified Team Setup Modal
 * Just asks: Team Type (single/institution) → Sports
 * Creator automatically becomes owner
 */
export function TeamSetupModal({ isOpen, onComplete, preSelectedSport }: TeamSetupModalProps) {
  const { sports, isLoading: sportsLoading } = useSports();
  const [step, setStep] = useState<Step>('team_type');
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>(preSelectedSport ? [preSelectedSport] : []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTeamTypeSelect = (type: 'single_team' | 'institution') => {
    setTeamType(type);

    // If single team and we have a pre-selected sport, auto-complete
    if (type === 'single_team' && preSelectedSport) {
      setSelectedSports([preSelectedSport]);
    }

    setStep('sports');
  };

  const toggleSport = (sportSlug: string) => {
    if (teamType === 'single_team') {
      // Single team: only one sport allowed
      setSelectedSports([sportSlug]);
    } else {
      // Institution: multiple sports allowed
      setSelectedSports((prev) =>
        prev.includes(sportSlug) ? prev.filter((s) => s !== sportSlug) : [...prev, sportSlug]
      );
    }
  };

  const handleComplete = async () => {
    if (!teamType || selectedSports.length === 0) {
      alert('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        teamType,
        sports: selectedSports,
      });
    } catch (error) {
      logger.error('Error completing team setup:', error);
      alert('Error setting up team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Configuración del Equipo</h2>
          <p className="text-gray-600">Configura tu equipo</p>
        </div>

        {/* Step 1: Team Type Selection */}
        {step === 'team_type' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                ¿Qué tipo de equipo estás creando?
              </h3>
              <p className="text-sm text-gray-600">Esto determina cómo organizamos tu panel de control</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Single Team Option */}
              <button
                onClick={() => handleTeamTypeSelect('single_team')}
                className="group relative p-8 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="text-5xl mb-4">👥</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Equipo Individual</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Un equipo, un deporte (5-30 jugadores)
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>✓ Panel de control simple</li>
                  <li>✓ Gestión de jugadores y pagos</li>
                  <li>✓ Solicitudes de diseño y pedidos</li>
                </ul>
              </button>

              {/* Institution Option */}
              <button
                onClick={() => handleTeamTypeSelect('institution')}
                className="group relative p-8 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="text-5xl mb-4">🏫</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Institución</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Múltiples equipos/deportes bajo una organización
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>✓ Gestión multi-deporte</li>
                  <li>✓ Panel de control centralizado</li>
                  <li>✓ Operaciones en masa</li>
                </ul>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Sports Selection */}
        {step === 'sports' && (
          <div className="space-y-6">
            <button
              onClick={() => setStep('team_type')}
              className="text-gray-600 hover:text-gray-900 text-sm mb-4"
            >
              ← Atrás
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {teamType === 'institution' ? '¿Qué deportes gestionas?' : '¿Qué deporte es este equipo?'}
              </h3>
              <p className="text-sm text-gray-600">
                {teamType === 'institution' ? 'Selecciona todos los que apliquen' : 'Elige un deporte'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sportsLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Cargando deportes...</p>
                </div>
              ) : sports.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-600">
                  No hay deportes disponibles
                </div>
              ) : (
                sports.map((sport) => {
                  const sportInfo = getSportInfo(sport.slug);
                  const isSelected = selectedSports.includes(sport.slug);
                  const isPreSelected = sport.slug === preSelectedSport;

                  return (
                    <button
                      key={sport.id}
                      onClick={() => toggleSport(sport.slug)}
                      disabled={isPreSelected && teamType === 'single_team'}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      } ${isPreSelected && teamType === 'single_team' ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-4xl mb-2">{sportInfo.emoji}</div>
                      <div className="font-semibold text-gray-900">{sport.name}</div>
                      {isSelected && (
                        <div className="mt-2 text-xs text-blue-600 font-medium">✓ Seleccionado</div>
                      )}
                      {isPreSelected && teamType === 'single_team' && (
                        <div className="mt-2 text-xs text-gray-500">(Del diseño)</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Complete Button */}
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleComplete}
                disabled={selectedSports.length === 0 || isSubmitting || sportsLoading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Configurando...' : 'Completar Configuración'}
              </button>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mt-8 flex justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${step === 'team_type' ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className={`w-2 h-2 rounded-full ${step === 'sports' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        </div>
      </div>
    </div>
  );
}
