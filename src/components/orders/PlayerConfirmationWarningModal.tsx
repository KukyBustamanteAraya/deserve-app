'use client';

interface PlayerConfirmationWarningModalProps {
  isOpen: boolean;
  unconfirmedCount: number;
  totalCount: number;
  onContinue: () => void;
  onCancel: () => void;
  teamId?: string;
}

export function PlayerConfirmationWarningModal({
  isOpen,
  unconfirmedCount,
  totalCount,
  onContinue,
  onCancel,
  teamId,
}: PlayerConfirmationWarningModalProps) {
  if (!isOpen) return null;

  const confirmedCount = totalCount - unconfirmedCount;
  const unconfirmedPercentage = Math.round((unconfirmedCount / totalCount) * 100);

  const handleSendReminders = () => {
    // Navigate to roster page where they can send individual reminders
    if (teamId) {
      window.location.href = `/mi-equipo/${teamId}/players`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-2xl w-full p-6 border border-gray-700 overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="relative mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/50">
              <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                ⚠️ Información de Jugadores No Confirmada
              </h2>
              <p className="text-gray-300 text-sm">
                {unconfirmedCount} de {totalCount} jugadores ({unconfirmedPercentage}%) no han confirmado su información
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="relative grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-400">Confirmados</span>
            </div>
            <p className="text-3xl font-bold text-white">{confirmedCount}</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium text-yellow-400">Pendientes</span>
            </div>
            <p className="text-3xl font-bold text-white">{unconfirmedCount}</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="relative mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Por qué esto importa?
          </h3>
          <ul className="text-sm text-blue-200 space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Tallas precisas</strong> reducen devoluciones y reemplazos</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Jugadores confirman</strong> usando nuestra calculadora de tallas para un ajuste perfecto</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Jugadores crean cuentas</strong> y permanecen en el ecosistema Deserve para futuros pedidos</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="relative flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="w-full px-6 py-3 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-600/50 transition-all border border-blue-600/50"
          >
            Continuar con Datos Actuales
          </button>

          {teamId && (
            <button
              onClick={handleSendReminders}
              className="w-full px-6 py-3 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-600/50 transition-all border border-green-600/50"
            >
              Ir al Roster y Enviar Recordatorios
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full px-6 py-2 bg-gray-800/50 text-gray-300 hover:text-white rounded-lg font-medium hover:bg-gray-700/50 transition-all border border-gray-700"
          >
            Cancelar
          </button>
        </div>

        {/* Footer Note */}
        <p className="relative mt-4 text-xs text-gray-400 text-center">
          Puedes proceder con la orden actual, pero recomendamos que los jugadores confirmen su información
        </p>
      </div>
    </div>
  );
}
