'use client';

import React from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  feedbackText: string;
  loading: boolean;
  onClose: () => void;
  onFeedbackChange: (text: string) => void;
  onSubmit: () => void;
}

const FeedbackModal = React.memo<FeedbackModalProps>(({
  isOpen,
  feedbackText,
  loading,
  onClose,
  onFeedbackChange,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-gray-800 via-black to-gray-900 rounded-lg shadow-2xl border border-gray-700 max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Solicitar Ajustes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Describe los cambios que deseas realizar
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Ej: Por favor cambiar el color del logo a azul marino y ajustar el tamaño de los números..."
              className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent min-h-[150px]"
              rows={6}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSubmit}
              disabled={loading || !feedbackText.trim()}
              className="flex-1 bg-[#e21c21] hover:bg-[#c11a1e] disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar Comentarios'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

FeedbackModal.displayName = 'FeedbackModal';

export default FeedbackModal;
