'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { AthleticProfile, SizeOption } from '@/types/profile';
import { EXTENDED_SIZES } from '@/constants/sizing';

interface AthleticProfileFormProps {
  initialData: AthleticProfile;
  onSave: (data: Partial<AthleticProfile>) => Promise<void>;
  disabled?: boolean;
}

// Import extended sizes from constants (single source of truth)
const sizeOptions = EXTENDED_SIZES;

const commonSports = [
  'Fútbol',
  'Básquetbol',
  'Voleibol',
  'Rugby',
  'Tenis',
  'Atletismo',
  'Natación',
  'Ciclismo',
  'Hockey',
  'Handball',
  'Béisbol',
  'Softball',
];

// Sport-specific positions mapping
const positionsBySport: Record<string, string[]> = {
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
    'Base',
    'Escolta',
    'Alero',
    'Ala-Pívot',
    'Pívot',
  ],
  'Voleibol': [
    'Armador',
    'Opuesto',
    'Central',
    'Receptor-Atacante',
    'Líbero',
  ],
  'Rugby': [
    'Pilar',
    'Hooker',
    'Segunda Línea',
    'Ala',
    'Octavo',
    'Medio Scrum',
    'Apertura',
    'Centro',
    'Wing',
    'Full Back',
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
  'Béisbol': [
    'Lanzador',
    'Receptor',
    'Primera Base',
    'Segunda Base',
    'Tercera Base',
    'Campocorto',
    'Jardinero Izquierdo',
    'Jardinero Central',
    'Jardinero Derecho',
  ],
  'Softball': [
    'Lanzador',
    'Receptor',
    'Primera Base',
    'Segunda Base',
    'Tercera Base',
    'Campocorto',
    'Jardinero Izquierdo',
    'Jardinero Central',
    'Jardinero Derecho',
  ],
};

const AthleticProfileForm = memo(function AthleticProfileForm({ initialData, onSave, disabled = false }: AthleticProfileFormProps) {
  const [formData, setFormData] = useState<Partial<AthleticProfile>>({
    sports: initialData.sports || [],
    primary_sport: initialData.primary_sport,
    default_size: initialData.default_size,
    default_positions: initialData.default_positions || [],
    preferred_jersey_number: initialData.preferred_jersey_number || '',
    fabric_preferences: {
      breathability: initialData.fabric_preferences?.breathability || 'standard',
      fit: initialData.fabric_preferences?.fit || 'regular',
    },
    measurements: {
      height_cm: initialData.measurements?.height_cm,
      weight_kg: initialData.measurements?.weight_kg,
      chest_cm: initialData.measurements?.chest_cm,
    },
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customPosition, setCustomPosition] = useState('');
  const [customSport, setCustomSport] = useState('');
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);

  const positionDropdownRef = useRef<HTMLDivElement>(null);

  // Get available positions based on selected sports
  const getAvailablePositions = (): string[] => {
    const selectedSports = formData.sports || [];
    if (selectedSports.length === 0) return [];

    const allPositions = new Set<string>();
    selectedSports.forEach((sport) => {
      const positions = positionsBySport[sport] || [];
      positions.forEach((pos) => allPositions.add(pos));
    });

    return Array.from(allPositions).sort();
  };

  const availablePositions = getAvailablePositions();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(event.target as Node)) {
        setIsPositionDropdownOpen(false);
      }
    };

    if (isPositionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPositionDropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || loading) return;

    setLoading(true);
    setSaved(false);

    try {
      await onSave(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving athletic profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePositionToggle = (position: string) => {
    const positions = formData.default_positions || [];
    const newPositions = positions.includes(position)
      ? positions.filter(p => p !== position)
      : [...positions, position];

    setFormData({ ...formData, default_positions: newPositions });
  };

  const handleAddCustomPosition = () => {
    if (!customPosition.trim()) return;

    const positions = formData.default_positions || [];
    if (!positions.includes(customPosition.trim())) {
      setFormData({
        ...formData,
        default_positions: [...positions, customPosition.trim()],
      });
    }
    setCustomPosition('');
  };

  const handleSportToggle = (sport: string) => {
    const sports = formData.sports || [];
    const newSports = sports.includes(sport)
      ? sports.filter(s => s !== sport)
      : [...sports, sport];

    setFormData({
      ...formData,
      sports: newSports,
      // If removing the primary sport, clear it
      primary_sport: newSports.includes(formData.primary_sport || '') ? formData.primary_sport : undefined
    });
  };

  const handleAddCustomSport = () => {
    if (!customSport.trim()) return;

    const sports = formData.sports || [];
    if (!sports.includes(customSport.trim())) {
      setFormData({
        ...formData,
        sports: [...sports, customSport.trim()],
      });
    }
    setCustomSport('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Perfil Atlético
        </h3>
        <p className="text-sm text-gray-300 mb-6">
          Esta información se usará para pre-rellenar tus pedidos y facilitar el proceso
        </p>
      </div>

      {/* Sports Selection */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Deportes que Practicas
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
          {commonSports.map((sport) => {
            const isSelected = formData.sports?.includes(sport);
            return (
              <button
                key={sport}
                type="button"
                onClick={() => handleSportToggle(sport)}
                disabled={disabled}
                className={`
                  relative py-2 px-3 rounded-md text-sm transition-all text-left overflow-hidden group/sport
                  ${isSelected
                    ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white ring-2 ring-[#e21c21]/50 shadow-lg shadow-[#e21c21]/30'
                    : 'bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-300 border border-gray-700 hover:border-[#e21c21]/50 hover:text-white'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/sport:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">{sport}</span>
              </button>
            );
          })}
        </div>

        {/* Custom sport input */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1 overflow-hidden rounded-md group/input">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="text"
              value={customSport}
              onChange={(e) => setCustomSport(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSport();
                }
              }}
              placeholder="Agregar otro deporte"
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustomSport}
            disabled={disabled || !customSport.trim()}
            className="relative px-4 py-2 bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 text-gray-300 rounded-md text-sm hover:text-white border border-gray-700 hover:border-[#e21c21]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group/btn"
          >
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">Agregar</span>
          </button>
        </div>

        {/* Primary Sport Selection */}
        {formData.sports && formData.sports.length > 0 && (
          <div className="mt-4 p-4 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
            <label className="block text-sm font-medium text-white mb-2">
              Deporte Principal
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {formData.sports.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setFormData({ ...formData, primary_sport: sport })}
                  disabled={disabled}
                  className={`
                    relative py-2 px-3 rounded-md text-sm transition-all overflow-hidden group/primary
                    ${formData.primary_sport === sport
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white ring-2 ring-[#e21c21]/50'
                      : 'bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 text-gray-300 border border-gray-600 hover:border-[#e21c21]/50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/primary:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{sport}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">Selecciona tu deporte principal</p>
          </div>
        )}
      </div>

      {/* Default Size */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Talla Por Defecto
        </label>
        <div className="grid grid-cols-7 gap-2">
          {sizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setFormData({ ...formData, default_size: size })}
              disabled={disabled}
              className={`
                relative py-2 px-3 rounded-md text-sm font-medium transition-all overflow-hidden group/size
                ${formData.default_size === size
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white ring-2 ring-[#e21c21]/50 shadow-lg shadow-[#e21c21]/30'
                  : 'bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-300 border border-gray-700 hover:border-[#e21c21]/50 hover:text-white'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/size:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">{size}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Positions - Only show if sports are selected */}
      {formData.sports && formData.sports.length > 0 && availablePositions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Posiciones
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Selecciona las posiciones que juegas en {formData.sports.join(', ')}
          </p>

          {/* Multi-select dropdown */}
          <div className="relative" ref={positionDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
              disabled={disabled}
              className="relative w-full px-4 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-left text-white hover:border-[#e21c21]/50 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 disabled:opacity-50 transition-all overflow-hidden group/dropdown"
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/dropdown:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="relative flex items-center justify-between">
                <span className={formData.default_positions && formData.default_positions.length > 0 ? 'text-white' : 'text-gray-500'}>
                  {formData.default_positions && formData.default_positions.length > 0
                    ? `${formData.default_positions.length} ${formData.default_positions.length === 1 ? 'posición seleccionada' : 'posiciones seleccionadas'}`
                    : 'Seleccionar posiciones'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isPositionDropdownOpen ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Dropdown menu */}
            {isPositionDropdownOpen && (
              <div className="absolute z-10 w-full mt-2 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 border border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto">
                {availablePositions.map((position) => {
                  const isSelected = formData.default_positions?.includes(position);
                  return (
                    <label
                      key={position}
                      className="relative flex items-center px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors overflow-hidden group/option"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/option:opacity-100 transition-opacity pointer-events-none"></div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePositionToggle(position)}
                        disabled={disabled}
                        className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
                      />
                      <span className="relative ml-3 text-sm text-white">{position}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom position input */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1 overflow-hidden rounded-md group/input">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
              <input
                type="text"
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomPosition();
                  }
                }}
                placeholder="Agregar posición personalizada"
                disabled={disabled}
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomPosition}
              disabled={disabled || !customPosition.trim()}
              className="relative px-4 py-2 bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 text-gray-300 rounded-md text-sm hover:text-white border border-gray-700 hover:border-[#e21c21]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group/btn"
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Agregar</span>
            </button>
          </div>

          {/* Selected positions display */}
          {formData.default_positions && formData.default_positions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.default_positions.map((position) => (
                <span
                  key={position}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#e21c21]/20 text-[#e21c21] border border-[#e21c21]/50"
                >
                  {position}
                  <button
                    type="button"
                    onClick={() => handlePositionToggle(position)}
                    disabled={disabled}
                    className="ml-2 text-[#e21c21] hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Jersey Number */}
      <div>
        <label htmlFor="jersey-number" className="block text-sm font-medium text-white mb-2">
          Número de Camiseta Preferido
        </label>
        <div className="relative overflow-hidden rounded-md group/input w-24">
          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
          <input
            id="jersey-number"
            type="text"
            maxLength={3}
            value={formData.preferred_jersey_number || ''}
            onChange={(e) => setFormData({ ...formData, preferred_jersey_number: e.target.value })}
            placeholder="Ej: 10"
            disabled={disabled}
            className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
          />
        </div>
        <p className="mt-1 text-sm text-gray-400">Máximo 3 caracteres</p>
      </div>

      {/* Fabric Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="breathability" className="block text-sm font-medium text-white mb-2">
            Transpirabilidad
          </label>
          <div className="relative overflow-hidden rounded-md group/select">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/select:opacity-100 transition-opacity pointer-events-none"></div>
            <select
              id="breathability"
              value={formData.fabric_preferences?.breathability || 'standard'}
              onChange={(e) => setFormData({
                ...formData,
                fabric_preferences: {
                  ...formData.fabric_preferences,
                  breathability: e.target.value as 'standard' | 'high',
                },
              })}
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
            >
              <option value="standard">Estándar</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fit" className="block text-sm font-medium text-white mb-2">
            Ajuste
          </label>
          <div className="relative overflow-hidden rounded-md group/select">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/select:opacity-100 transition-opacity pointer-events-none"></div>
            <select
              id="fit"
              value={formData.fabric_preferences?.fit || 'regular'}
              onChange={(e) => setFormData({
                ...formData,
                fabric_preferences: {
                  ...formData.fabric_preferences,
                  fit: e.target.value as 'regular' | 'slim' | 'relaxed',
                },
              })}
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
            >
              <option value="regular">Regular</option>
              <option value="slim">Ajustado</option>
              <option value="relaxed">Holgado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Measurements (Optional) */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Medidas (Opcional)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="height" className="block text-xs text-gray-400 mb-1">
              Altura (cm)
            </label>
            <div className="relative overflow-hidden rounded-md group/input">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
              <input
                id="height"
                type="number"
                min="100"
                max="250"
                value={formData.measurements?.height_cm || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  measurements: {
                    ...formData.measurements,
                    height_cm: e.target.value ? Number(e.target.value) : undefined,
                  },
                })}
                placeholder="175"
                disabled={disabled}
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="weight" className="block text-xs text-gray-400 mb-1">
              Peso (kg)
            </label>
            <div className="relative overflow-hidden rounded-md group/input">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
              <input
                id="weight"
                type="number"
                min="30"
                max="200"
                value={formData.measurements?.weight_kg || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  measurements: {
                    ...formData.measurements,
                    weight_kg: e.target.value ? Number(e.target.value) : undefined,
                  },
                })}
                placeholder="70"
                disabled={disabled}
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="chest" className="block text-xs text-gray-400 mb-1">
              Pecho (cm)
            </label>
            <div className="relative overflow-hidden rounded-md group/input">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
              <input
                id="chest"
                type="number"
                min="50"
                max="150"
                value={formData.measurements?.chest_cm || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  measurements: {
                    ...formData.measurements,
                    chest_cm: e.target.value ? Number(e.target.value) : undefined,
                  },
                })}
                placeholder="95"
                disabled={disabled}
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div>
          {saved && (
            <span className="text-sm text-green-400 flex items-center">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Guardado correctamente
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || loading}
          className="relative px-6 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-md font-medium text-sm transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/submit disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/submit:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">{loading ? 'Guardando...' : 'Guardar Perfil Atlético'}</span>
        </button>
      </div>
    </form>
  );
});

export default AthleticProfileForm;
