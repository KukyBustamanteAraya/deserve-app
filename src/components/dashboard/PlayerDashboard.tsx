'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SplitPayButton } from '@/components/payment/SplitPayButton';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string };
  logo_url?: string;
}

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  sport_slug: string;
  created_at: string;
  mockup_urls?: string[];
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  order_id?: string;
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total_amount_cents: number;
}

interface Member {
  user_id: string;
  role: string;
  profiles?: { email: string; full_name?: string };
}

interface Props {
  team: Team;
  designRequests: DesignRequest[];
  orders: Order[];
  members: Member[];
  currentUserId: string;
  shareLink: string;
  onInvite: (email: string) => Promise<void>;
}

/**
 * Player/Small Team Dashboard
 * Optimized for recreational teams (5-15 players)
 * Focus: Simple design view, split payments, who's paid
 */
export function PlayerDashboard({
  team,
  designRequests,
  orders,
  members,
  currentUserId,
  shareLink,
  onInvite,
}: Props) {
  const router = useRouter();

  const getOrderForDesignRequest = (designRequestId: string) => {
    const dr = designRequests.find((d) => d.id === designRequestId);
    if (!dr || !dr.order_id) return null;
    return orders.find((o) => o.id === dr.order_id);
  };

  const latestDesign = designRequests[0];
  const latestOrder = latestDesign ? getOrderForDesignRequest(latestDesign.id) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero Section - Current Design */}
      {latestDesign ? (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{latestDesign.product_name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 capitalize">{latestDesign.sport_slug}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    latestDesign.status === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : latestDesign.status === 'rendering'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {latestDesign.status === 'ready'
                    ? '✓ Diseño Listo'
                    : latestDesign.status === 'rendering'
                    ? '⏳ Generando diseño...'
                    : '📝 Pendiente'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-lg border-2" style={{ backgroundColor: latestDesign.primary_color }} />
              <div className="w-10 h-10 rounded-lg border-2" style={{ backgroundColor: latestDesign.secondary_color }} />
              <div className="w-10 h-10 rounded-lg border-2" style={{ backgroundColor: latestDesign.accent_color }} />
            </div>
          </div>

          {/* Mockup Preview */}
          {latestDesign.status === 'ready' && latestDesign.mockup_urls && latestDesign.mockup_urls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {latestDesign.mockup_urls.slice(0, 3).map((url, i) => (
                <Image
                  key={i}
                  src={url}
                  alt={`Mockup ${i + 1}`}
                  width={300}
                  height={300}
                  className="rounded-lg border-2 w-full object-cover"
                />
              ))}
            </div>
          )}

          {/* Payment Section - Prominent for Players */}
          {latestOrder && latestOrder.payment_status !== 'paid' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">Tu Parte del Pago</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Paga tu parte individualmente con Mercado Pago</p>
              <SplitPayButton orderId={latestOrder.id} userId={currentUserId} amountCents={50000} />
            </div>
          )}

          {latestOrder && latestOrder.payment_status === 'paid' && (
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">¡Pagado! Gracias por tu aporte</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-12 mb-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">¡Bienvenido a {team.name}!</h1>
          <p className="text-xl mb-6 opacity-90">Crea tu primer diseño de uniforme personalizado</p>
          <button
            onClick={() => router.push('/catalog')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            Ver Catálogo de Diseños
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Members - Prominent for Players */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Tu Equipo ({members.length})</h2>
            <button
              onClick={() => {
                const email = prompt('Email del compañero:');
                if (email) onInvite(email);
              }}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ backgroundColor: team.colors.primary, color: 'white' }}
            >
              + Invitar
            </button>
          </div>

          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    {m.profiles?.full_name?.[0] || m.profiles?.email?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {m.user_id === currentUserId ? (
                        <span>
                          Tú <span className="text-xs text-gray-500">(tú)</span>
                        </span>
                      ) : (
                        m.profiles?.full_name || m.profiles?.email || `Miembro ${m.user_id.substring(0, 8)}`
                      )}
                    </p>
                    {m.profiles?.email && m.user_id !== currentUserId && (
                      <p className="text-xs text-gray-500">{m.profiles.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* TODO: Show payment status per member */}
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{m.role}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Share Link */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Invitar por enlace:</p>
            <div className="flex gap-2">
              <input type="text" value={shareLink} readOnly className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('¡Enlace copiado!');
                }}
                className="px-4 py-2 text-sm rounded-lg text-white"
                style={{ backgroundColor: team.colors.primary }}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/catalog')}
                className="w-full px-4 py-3 border-2 rounded-lg hover:bg-gray-50 text-left font-medium"
              >
                🎨 Nuevo Diseño
              </button>
              {designRequests.length > 0 && (
                <button
                  onClick={() => router.push('/personaliza')}
                  className="w-full px-4 py-3 border-2 rounded-lg hover:bg-gray-50 text-left font-medium"
                >
                  ✏️ Modificar Diseño
                </button>
              )}
            </div>
          </div>

          {/* Previous Designs (if more than one) */}
          {designRequests.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold mb-4">Diseños Anteriores</h3>
              <div className="space-y-2">
                {designRequests.slice(1, 4).map((dr) => (
                  <div key={dr.id} className="p-3 border rounded-lg text-sm">
                    <p className="font-medium">{dr.product_name}</p>
                    <p className="text-xs text-gray-500">{new Date(dr.created_at).toLocaleDateString('es-CL')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
