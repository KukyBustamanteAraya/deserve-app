'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  created_at: string;
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
 * Manager/Club Dashboard
 * Optimized for large teams, clubs, schools
 * Focus: Multiple designs, bulk orders, roster management, order tracking
 */
export function ManagerDashboard({
  team,
  designRequests,
  orders,
  members,
  currentUserId,
  shareLink,
  onInvite,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'designs' | 'orders' | 'roster'>('designs');

  const getOrderForDesignRequest = (designRequestId: string) => {
    const dr = designRequests.find((d) => d.id === designRequestId);
    if (!dr || !dr.order_id) return null;
    return orders.find((o) => o.id === dr.order_id);
  };

  // Group designs by sport
  const designsBySport = designRequests.reduce((acc, dr) => {
    const sport = dr.sport_slug || 'other';
    if (!acc[sport]) acc[sport] = [];
    acc[sport].push(dr);
    return acc;
  }, {} as Record<string, DesignRequest[]>);

  const totalPendingPayments = orders.filter((o) => o.payment_status === 'unpaid').length;
  const totalCompletedOrders = orders.filter((o) => o.payment_status === 'paid').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
            <p className="text-gray-600">Panel de Administración</p>
          </div>
          <button
            onClick={() => router.push('/catalog')}
            className="px-6 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: team.colors.primary }}
          >
            + Nuevo Pedido
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: team.colors.primary }}>
            <p className="text-sm text-gray-600 mb-1">Diseños Totales</p>
            <p className="text-3xl font-bold">{designRequests.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Miembros del Equipo</p>
            <p className="text-3xl font-bold">{members.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">Pagos Pendientes</p>
            <p className="text-3xl font-bold">{totalPendingPayments}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Pedidos Completados</p>
            <p className="text-3xl font-bold">{totalCompletedOrders}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('designs')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'designs'
                  ? 'border-current text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Diseños y Pedidos
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-current text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Seguimiento de Órdenes
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'roster'
                  ? 'border-current text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Gestión de Plantel
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Designs Tab */}
          {activeTab === 'designs' && (
            <div>
              {designRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-bold mb-2">No hay diseños aún</h3>
                  <p className="text-gray-600 mb-6">Comienza creando tu primer pedido de uniformes</p>
                  <button
                    onClick={() => router.push('/catalog')}
                    className="px-6 py-3 rounded-lg text-white font-semibold"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    Ver Catálogo
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group by Sport */}
                  {Object.entries(designsBySport).map(([sport, designs]) => (
                    <div key={sport}>
                      <h3 className="text-lg font-bold mb-3 capitalize flex items-center gap-2">
                        <span className="text-2xl">
                          {sport === 'football' ? '⚽' : sport === 'basketball' ? '🏀' : sport === 'volleyball' ? '🏐' : '🏃'}
                        </span>
                        {sport} ({designs.length})
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {designs.map((dr) => {
                          const order = getOrderForDesignRequest(dr.id);
                          return (
                            <div key={dr.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-bold text-lg">{dr.product_name}</h4>
                                  <p className="text-sm text-gray-500">{new Date(dr.created_at).toLocaleDateString('es-CL')}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      dr.status === 'ready'
                                        ? 'bg-green-100 text-green-800'
                                        : dr.status === 'rendering'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {dr.status === 'ready' ? 'Listo' : dr.status === 'rendering' ? 'Generando' : 'Pendiente'}
                                  </span>
                                  {order && (
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        order.payment_status === 'paid'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      {order.payment_status === 'paid' ? '✓ Pagado' : 'Pago pendiente'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Colors */}
                              <div className="flex gap-2 mb-3">
                                <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: dr.primary_color }} />
                                <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: dr.secondary_color }} />
                                <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: dr.accent_color }} />
                              </div>

                              {/* Mockup Preview */}
                              {dr.status === 'ready' && dr.mockup_urls && dr.mockup_urls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  {dr.mockup_urls.slice(0, 3).map((url, i) => (
                                    <Image
                                      key={i}
                                      src={url}
                                      alt={`Mockup ${i + 1}`}
                                      width={150}
                                      height={150}
                                      className="rounded border w-full object-cover"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 mt-3">
                                <button className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 font-medium">
                                  Ver Detalles
                                </button>
                                {order && order.payment_status !== 'paid' && (
                                  <button
                                    className="flex-1 px-3 py-2 text-sm rounded-lg text-white font-medium"
                                    style={{ backgroundColor: team.colors.primary }}
                                  >
                                    Pagar Orden
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-bold mb-2">No hay órdenes aún</h3>
                  <p className="text-gray-600">Las órdenes aparecerán aquí una vez que se creen los diseños</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-bold">Orden #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString('es-CL')}</p>
                        <p className="text-sm font-medium mt-1">
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                            order.total_amount_cents / 100
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status === 'completed' ? 'Completado' : order.status === 'processing' ? 'En proceso' : 'Pendiente'}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {order.payment_status === 'paid' ? 'Pagado' : 'No pagado'}
                        </span>
                        <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 font-medium">Ver Detalles</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roster Tab */}
          {activeTab === 'roster' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Plantel ({members.length} miembros)</h3>
                <button
                  onClick={() => {
                    const email = prompt('Email del nuevo miembro:');
                    if (email) onInvite(email);
                  }}
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: team.colors.primary }}
                >
                  + Agregar Miembro
                </button>
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Talla</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((m) => (
                      <tr key={m.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {m.profiles?.full_name || m.profiles?.email?.split('@')[0] || `Usuario ${m.user_id.substring(0, 8)}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.profiles?.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">{m.role}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">-</td>
                        <td className="px-4 py-3 text-sm text-gray-600">-</td>
                        <td className="px-4 py-3">
                          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Share Link */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Enlace de invitación:</p>
                <div className="flex gap-2">
                  <input type="text" value={shareLink} readOnly className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white" />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      alert('¡Enlace copiado!');
                    }}
                    className="px-4 py-2 text-sm rounded-lg text-white font-medium"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
