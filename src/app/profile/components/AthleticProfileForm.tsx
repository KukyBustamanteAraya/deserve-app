'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import type { AthleticProfile } from '@/hooks/useProfile';

interface AthleticProfileFormProps {
  onComplete: () => void;
}

const SPORTS = [
  'Fútbol',
  'Básquetbol',
  'Vóleibol',
  'Rugby',
  'Handball',
  'Hockey',
  'Atletismo',
  'Otro',
];

const POSITIONS_BY_SPORT: Record<string, string[]> = {
  'Fútbol': [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Mediocampista Defensivo',
    'Mediocampista Central',
    'Mediocampista Ofensivo',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Delantero Centro',
  ],
  'Básquetbol': [
    'Base (Point Guard)',
    'Escolta (Shooting Guard)',
    'Alero (Small Forward)',
    'Ala-Pívot (Power Forward)',
    'Pívot (Center)',
  ],
  'Vóleibol': [
    'Armador/a (Setter)',
    'Opuesto/a',
    'Punta (Outside Hitter)',
    'Central (Middle Blocker)',
    'Líbero',
  ],
  'Rugby': [
    'Pilar (Prop)',
    'Hooker',
    'Segunda Línea (Lock)',
    'Ala (Flanker)',
    'Octavo (Number 8)',
    'Medio Scrum',
    'Apertura (Fly-half)',
    'Centro',
    'Ala (Wing)',
    'Zaguero (Fullback)',
  ],
  'Handball': [
    'Portero',
    'Extremo Izquierdo',
    'Extremo Derecho',
    'Lateral Izquierdo',
    'Lateral Derecho',
    'Central',
    'Pivote',
  ],
  'Hockey': [
    'Portero',
    'Defensa',
    'Mediocampista',
    'Delantero',
  ],
};

export default function AthleticProfileForm({ onComplete }: AthleticProfileFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<AthleticProfile>>({
    sports: [],
    primary_sport: '',
    positions: [],
    jersey_number: '',
  });

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  const handleSportToggle = (sport: string) => {
    const currentSports = formData.sports || [];
    const newSports = currentSports.includes(sport)
      ? currentSports.filter((s) => s !== sport)
      : [...currentSports, sport];

    setFormData({
      ...formData,
      sports: newSports,
      primary_sport: newSports.length === 1 ? newSports[0] : formData.primary_sport,
    });
  };

  const handlePositionToggle = (sport: string, position: string) => {
    const currentPositions = formData.positions || [];
    const positionKey = `${sport} - ${position}`;

    const newPositions = currentPositions.includes(positionKey)
      ? currentPositions.filter((p) => p !== positionKey)
      : [...currentPositions, positionKey];

    setFormData({ ...formData, positions: newPositions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('No user logged in');
      return;
    }

    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre completo');
      return;
    }

    if (!gender) {
      setError('Por favor selecciona tu género');
      return;
    }

    if (!formData.sports || formData.sports.length === 0) {
      setError('Por favor selecciona al menos un deporte');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Add gender to athletic_profile
      const athleticProfileWithGender = {
        ...formData,
        gender: gender,
      };

      // Update profile with full_name and athletic_profile
      const { error: updateError } = await supabaseBrowser
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          athletic_profile: athleticProfileWithGender,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onComplete();
    } catch (err: any) {
      console.error('[AthleticProfileForm] Error:', err);
      setError(err.message || 'Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="relative bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nombre Completo *
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ej: Juan Pérez"
          required
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Género *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`px-4 py-3 rounded-lg border-2 transition-all ${
              gender === 'male'
                ? 'border-blue-500 bg-blue-500/20 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-blue-500/50'
            }`}
          >
            Masculino
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`px-4 py-3 rounded-lg border-2 transition-all ${
              gender === 'female'
                ? 'border-blue-500 bg-blue-500/20 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-blue-500/50'
            }`}
          >
            Femenino
          </button>
        </div>
      </div>

      {/* Sports Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          ¿Qué deportes practicas? *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SPORTS.map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => handleSportToggle(sport)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                formData.sports?.includes(sport)
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-blue-500/50'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Sport */}
      {formData.sports && formData.sports.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deporte Principal *
          </label>
          <select
            value={formData.primary_sport || ''}
            onChange={(e) => setFormData({ ...formData, primary_sport: e.target.value })}
            required
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">Selecciona tu deporte principal</option>
            {formData.sports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Positions for all selected sports */}
      {formData.sports && formData.sports.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Posiciones por Deporte</h3>
          {formData.sports.map((sport) => {
            const positions = POSITIONS_BY_SPORT[sport];
            if (!positions) return null;

            return (
              <div key={sport}>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {sport}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {positions.map((position) => {
                    const positionKey = `${sport} - ${position}`;
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => handlePositionToggle(sport, position)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                          formData.positions?.includes(positionKey)
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-blue-500/50'
                        }`}
                      >
                        {position}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Jersey Number (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Número de Camiseta (Opcional)
        </label>
        <input
          type="text"
          value={formData.jersey_number || ''}
          onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
          placeholder="Ej: 10"
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !fullName.trim() || !gender || !formData.sports || formData.sports.length === 0}
        className="w-full relative py-3 rounded-lg bg-gradient-to-br from-blue-600/90 via-blue-500/80 to-blue-700/90 text-white font-semibold transition-all shadow-lg hover:shadow-blue-500/50 border border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <span className="relative">
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
              Guardando...
            </>
          ) : (
            'Continuar'
          )}
        </span>
      </button>

      <p className="text-xs text-gray-400 text-center">
        Podrás actualizar esta información en cualquier momento desde tu perfil
      </p>
    </form>
  );
}
