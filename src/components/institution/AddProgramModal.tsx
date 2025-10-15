'use client';

import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

interface AddProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionSlug: string;
  onSuccess: () => void;
}

export function AddProgramModal({ isOpen, onClose, institutionSlug, onSuccess }: AddProgramModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sport_id: '',
    level: '',
    head_coach_user_id: '',
  });
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSports() {
      const supabase = getBrowserClient();
      const { data } = await supabase
        .from('sports')
        .select('*')
        .order('name');

      if (data) {
        setSports(data);
      }
    }

    if (isOpen) {
      loadSports();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/institutions/${institutionSlug}/sub-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          sport_id: parseInt(formData.sport_id),
          level: formData.level || null,
          head_coach_user_id: formData.head_coach_user_id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create program');
      }

      // Reset form
      setFormData({ name: '', sport_id: '', level: '', head_coach_user_id: '' });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full border border-gray-700 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="relative p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Agregar Programa Deportivo</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Programa *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Varsity Masculino, JV Femenino"
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deporte *
            </label>
            <select
              value={formData.sport_id}
              onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer"
              required
            >
              <option value="">Seleccionar deporte</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nivel (opcional)
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer"
            >
              <option value="">Seleccionar nivel</option>
              <option value="varsity">Varsity</option>
              <option value="jv">JV (Junior Varsity)</option>
              <option value="freshman">Freshman</option>
              <option value="middle_school">Middle School</option>
              <option value="u18">Sub-18</option>
              <option value="u17">Sub-17</option>
              <option value="u15">Sub-15</option>
              <option value="u13">Sub-13</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800/50 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creando...' : 'Crear Programa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
