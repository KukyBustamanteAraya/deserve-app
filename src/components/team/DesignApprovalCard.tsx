'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

type DesignRequest = {
  id: number;
  team_id: string;
  product_name?: string;
  status: string;
  mockup_urls: string[] | null;
  created_at: string;
  updated_at: string;
};

type DesignApprovalCardProps = {
  designRequest: DesignRequest;
  canApprove: boolean;
  onApprovalChange?: () => void;
};

export function DesignApprovalCard({
  designRequest,
  canApprove,
  onApprovalChange,
}: DesignApprovalCardProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = getBrowserClient();

  const handleApprove = async () => {
    if (!canApprove) return;

    if (!confirm('¿Estás seguro de que quieres aprobar este diseño?')) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('design_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', designRequest.id);

      if (error) throw error;

      alert('¡Diseño aprobado exitosamente!');
      onApprovalChange?.();
    } catch (error: any) {
      console.error('Error approving design:', error);
      alert('Error al aprobar el diseño: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!canApprove) return;

    if (!comment.trim()) {
      alert('Por favor agrega un comentario explicando los cambios solicitados');
      return;
    }

    if (!confirm('¿Solicitar cambios en este diseño?')) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('design_requests')
        .update({
          status: 'changes_requested',
          updated_at: new Date().toISOString(),
          // TODO: Store comment in a design_comments table
        })
        .eq('id', designRequest.id);

      if (error) throw error;

      alert('Solicitud de cambios enviada al administrador');
      setComment('');
      onApprovalChange?.();
    } catch (error: any) {
      console.error('Error requesting changes:', error);
      alert('Error al solicitar cambios: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Status messages
  const statusMessages: Record<string, { text: string; color: string }> = {
    pending: {
      text: 'Pendiente - El administrador está preparando el diseño',
      color: 'bg-yellow-100 text-yellow-800',
    },
    rendering: {
      text: 'Generando mockups del diseño...',
      color: 'bg-blue-100 text-blue-800',
    },
    ready: {
      text: canApprove
        ? 'Listo para aprobar - Revisa el diseño y apruébalo'
        : 'Esperando aprobación del manager',
      color: 'bg-green-100 text-green-800',
    },
    approved: {
      text: '✅ Diseño aprobado',
      color: 'bg-green-100 text-green-800',
    },
    changes_requested: {
      text: 'Cambios solicitados - El administrador está actualizando el diseño',
      color: 'bg-orange-100 text-orange-800',
    },
  };

  const statusInfo = statusMessages[designRequest.status] || {
    text: designRequest.status,
    color: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          🎨 Diseño del Uniforme
        </h2>
        {designRequest.product_name && (
          <p className="text-blue-100 mt-1">{designRequest.product_name}</p>
        )}
      </div>

      {/* Status Badge */}
      <div className="px-6 py-4 border-b border-gray-200">
        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Mockups Display */}
      {designRequest.mockup_urls && designRequest.mockup_urls.length > 0 ? (
        <div className="px-6 py-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mockups del Diseño</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designRequest.mockup_urls.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors group"
              >
                <img
                  src={url}
                  alt={`Mockup ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  <button
                    onClick={() => window.open(url, '_blank')}
                    className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-lg font-medium transition-opacity"
                  >
                    Ver en grande
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-12">
          <div className="text-center bg-gray-50 rounded-lg py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">
              {designRequest.status === 'pending' && 'El diseño está siendo preparado por el administrador...'}
              {designRequest.status === 'rendering' && '🎨 Generando mockups del diseño...'}
              {designRequest.status === 'changes_requested' && '✏️ El administrador está realizando cambios...'}
            </p>
          </div>
        </div>
      )}

      {/* Approval Actions (Only for ready status and authorized users) */}
      {designRequest.status === 'ready' && canApprove && (
        <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aprobar o Solicitar Cambios</h3>

          {/* Comment Box */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentarios (opcional para aprobar, requerido para solicitar cambios)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Agrega tus comentarios sobre el diseño..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={submitting}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? 'Aprobando...' : '✅ Aprobar Diseño'}
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={submitting}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {submitting ? 'Enviando...' : '✏️ Solicitar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Read-Only Message for Members */}
      {designRequest.status === 'ready' && !canApprove && (
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Esperando aprobación:</strong> Solo el manager puede aprobar o solicitar cambios en este diseño.
          </p>
        </div>
      )}

      {/* Approved Message */}
      {designRequest.status === 'approved' && (
        <div className="px-6 py-4 bg-green-50 border-t border-green-200">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <strong>Diseño aprobado - El siguiente paso es recopilar la información de los jugadores y procesar el pago.</strong>
          </p>
        </div>
      )}
    </div>
  );
}
