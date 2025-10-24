'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface NameCollectionModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  title?: string;
  description?: string;
  skipButton?: boolean;
}

export default function NameCollectionModal({
  isOpen,
  onComplete,
  onSkip,
  title = '¡Bienvenido!',
  description = 'Para una mejor experiencia, por favor dinos cómo te llamas',
  skipButton = false,
}: NameCollectionModalProps) {
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No autenticado');

      // Update profile with full_name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      logger.info('User name updated successfully');
      onComplete();
    } catch (err) {
      logger.error('Error updating name:', toError(err));
      setError('Error al guardar tu nombre. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Juan Pérez"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {skipButton && (
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Omitir
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className={`${skipButton ? 'flex-1' : 'w-full'} px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? 'Guardando...' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
