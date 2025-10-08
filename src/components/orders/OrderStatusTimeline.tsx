'use client';

interface OrderStatusTimelineProps {
  currentStatus: string;
  statusHistory?: Array<{
    status: string;
    created_at: string;
    notes?: string;
  }>;
  designApprovedAt?: string;
  productionStartedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  carrier?: string;
}

const STATUS_FLOW = [
  { key: 'pending', label: 'Pendiente', icon: '📝', color: 'gray' },
  { key: 'paid', label: 'Pagado', icon: '💳', color: 'green' },
  { key: 'design_review', label: 'Revisión de Diseño', icon: '🎨', color: 'blue' },
  { key: 'design_approved', label: 'Diseño Aprobado', icon: '✓', color: 'green' },
  { key: 'production', label: 'En Producción', icon: '🏭', color: 'purple' },
  { key: 'quality_check', label: 'Control de Calidad', icon: '🔍', color: 'indigo' },
  { key: 'shipped', label: 'Enviado', icon: '📦', color: 'blue' },
  { key: 'delivered', label: 'Entregado', icon: '✅', color: 'green' },
];

const SPECIAL_STATUSES = {
  design_changes: { label: 'Cambios Solicitados', icon: '🔄', color: 'yellow' },
};

export function OrderStatusTimeline({
  currentStatus,
  statusHistory,
  trackingNumber,
  carrier,
}: OrderStatusTimelineProps) {
  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  const isSpecialStatus = currentStatus in SPECIAL_STATUSES;

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-bold mb-6">Estado del Pedido</h3>

      {/* Special Status Alert (if applicable) */}
      {isSpecialStatus && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{SPECIAL_STATUSES[currentStatus as keyof typeof SPECIAL_STATUSES].icon}</span>
            <div>
              <p className="font-semibold text-yellow-800">
                {SPECIAL_STATUSES[currentStatus as keyof typeof SPECIAL_STATUSES].label}
              </p>
              <p className="text-sm text-yellow-700">
                El equipo está trabajando en los cambios solicitados. Te notificaremos cuando estén listos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Info (if shipped) */}
      {trackingNumber && (
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="font-semibold text-blue-900 mb-1">Información de Envío</p>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-blue-700">Transportista:</span>{' '}
              <span className="font-medium">{carrier || 'No especificado'}</span>
            </div>
            <div>
              <span className="text-blue-700">Nº Seguimiento:</span>{' '}
              <span className="font-mono font-medium">{trackingNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {STATUS_FLOW.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const statusHistoryEntry = statusHistory?.find((h) => h.status === step.key);

          return (
            <div key={step.key} className="relative pb-8 last:pb-0">
              {/* Vertical Line */}
              {index < STATUS_FLOW.length - 1 && (
                <div
                  className={`absolute left-4 top-10 w-0.5 h-full -ml-px ${
                    isPast ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Step */}
              <div className="flex items-start gap-4">
                {/* Icon Circle */}
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isCurrent
                      ? `border-${step.color}-500 bg-${step.color}-500 text-white shadow-lg`
                      : isPast
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  <span className="text-sm">{step.icon}</span>
                  {isCurrent && (
                    <span className="absolute -inset-1 rounded-full border-2 border-current animate-ping opacity-75" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold ${isCurrent ? 'text-gray-900' : isPast ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {statusHistoryEntry && (
                      <p className="text-xs text-gray-500">
                        {new Date(statusHistoryEntry.created_at).toLocaleDateString('es-CL', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                  {isCurrent && (
                    <p className="text-sm text-gray-600 mt-1">Estado actual de tu pedido</p>
                  )}
                  {statusHistoryEntry?.notes && (
                    <p className="text-xs text-gray-500 mt-1">{statusHistoryEntry.notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Percentage */}
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Progreso</span>
          <span className="font-semibold text-gray-900">
            {Math.round(((currentIndex + 1) / STATUS_FLOW.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / STATUS_FLOW.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
