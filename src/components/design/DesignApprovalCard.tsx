'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getBrowserClient } from '@/lib/supabase/client';

interface DesignApprovalCardProps {
  designRequestId: string;
  productName: string;
  mockupUrls: string[];
  approvalStatus: string;
  revisionCount: number;
  onApprovalChange?: () => void;
}

export function DesignApprovalCard({
  designRequestId,
  productName,
  mockupUrls,
  approvalStatus,
  revisionCount,
  onApprovalChange,
}: DesignApprovalCardProps) {
  const supabase = getBrowserClient();
  const [loading, setLoading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [requestedChanges, setRequestedChanges] = useState({
    colors: false,
    logos: false,
    text: false,
    layout: false,
    other: false,
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('design_feedback').insert({
        design_request_id: designRequestId,
        user_id: user.id,
        feedback_type: 'approval',
        message: 'Diseño aprobado por el cliente',
      });

      onApprovalChange?.();
      alert('¡Diseño aprobado! Procederemos con la producción.');
    } catch (error: any) {
      console.error('Error approving design:', error);
      alert('Error al aprobar el diseño');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedbackMessage.trim()) {
      alert('Por favor describe los cambios que deseas');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('design_feedback').insert({
        design_request_id: designRequestId,
        user_id: user.id,
        feedback_type: 'changes_requested',
        message: feedbackMessage,
        requested_changes: requestedChanges,
      });

      setShowFeedbackForm(false);
      setFeedbackMessage('');
      setRequestedChanges({ colors: false, logos: false, text: false, layout: false, other: false });
      onApprovalChange?.();
      alert('Solicitud de cambios enviada. Te notificaremos cuando esté lista la nueva versión.');
    } catch (error: any) {
      console.error('Error requesting changes:', error);
      alert('Error al solicitar cambios');
    } finally {
      setLoading(false);
    }
  };

  if (approvalStatus === 'approved') {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-bold text-green-900">Diseño Aprobado</h3>
            <p className="text-sm text-green-700">Este diseño ha sido aprobado y está en producción</p>
          </div>
        </div>
        {mockupUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {mockupUrls.slice(0, 3).map((url, i) => (
              <Image
                key={i}
                src={url}
                alt={`Diseño aprobado ${i + 1}`}
                width={200}
                height={200}
                className="rounded-lg border-2 border-green-300 w-full object-cover"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (approvalStatus === 'changes_requested') {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white text-2xl">
            🔄
          </div>
          <div>
            <h3 className="text-lg font-bold text-yellow-900">Cambios Solicitados</h3>
            <p className="text-sm text-yellow-700">
              Estamos trabajando en los cambios solicitados. Te notificaremos cuando estén listos.
            </p>
            {revisionCount > 0 && (
              <p className="text-xs text-yellow-600 mt-1">Revisiones: {revisionCount}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white text-xl px-4 py-2 hover:bg-white/10 rounded"
            >
              ✕ Cerrar
            </button>
            <Image
              src={selectedImage}
              alt="Vista ampliada"
              width={1200}
              height={1200}
              className="max-h-[90vh] w-auto object-contain"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
          👀
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Revisión de Diseño</h3>
          <p className="text-sm text-gray-600">¿Qué te parece {productName}?</p>
        </div>
      </div>

      {/* Mockup Images */}
      {mockupUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {mockupUrls.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square cursor-pointer group"
              onClick={() => setSelectedImage(url)}
            >
              <Image
                src={url}
                alt={`Mockup ${i + 1}`}
                width={300}
                height={300}
                className="rounded-lg border-2 w-full h-full object-cover group-hover:border-blue-400 transition-colors"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                  Click para ampliar
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showFeedbackForm ? (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Procesando...' : '✓ Aprobar Diseño'}
          </button>
          <button
            onClick={() => setShowFeedbackForm(true)}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🔄 Solicitar Cambios
          </button>
        </div>
      ) : (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-gray-900">¿Qué te gustaría cambiar?</h4>

          {/* Change Categories */}
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(requestedChanges).map((key) => (
              <label key={key} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestedChanges[key as keyof typeof requestedChanges]}
                  onChange={(e) =>
                    setRequestedChanges({
                      ...requestedChanges,
                      [key]: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm capitalize">{key === 'other' ? 'Otro' : key}</span>
              </label>
            ))}
          </div>

          {/* Feedback Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe los cambios que deseas <span className="text-red-500">*</span>
            </label>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Me gustaría que el color azul sea más oscuro, y el logo esté centrado..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowFeedbackForm(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={loading || !feedbackMessage.trim()}
              className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </div>
      )}

      {revisionCount > 0 && (
        <p className="text-xs text-gray-500 mt-4 text-center">
          Revisiones anteriores: {revisionCount}
        </p>
      )}
    </div>
  );
}
