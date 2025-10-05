'use client';

import React, { useState, useTransition } from 'react';

interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'paid' | 'cancelled';
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  profiles: {
    id: string;
    email: string;
  };
}

interface Props {
  initialOrders: Order[];
}

export default function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isPending, startTransition] = useTransition();

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'paid' | 'cancelled') => {
    if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update order status');
        }

        const { order } = await response.json();

        // Update the local state
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: order.status } : o));

        // Show success message
        const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        alert(`Order marked as ${statusText} successfully!`);

      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update order status');
      }
    });
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600">Manage customer orders and update their status</p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order.profiles.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(order.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${formatPrice(order.total_cents)} {order.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'paid')}
                        disabled={isPending}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Mark as Paid
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 ml-2"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'paid' && (
                    <span className="text-gray-500 text-xs">Paid</span>
                  )}
                  {order.status === 'cancelled' && (
                    <span className="text-gray-500 text-xs">Cancelled</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No orders found.
          </div>
        )}
      </div>

      {/* Order Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {orders.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
          <div className="mt-2 text-3xl font-bold text-yellow-600">
            {orders.filter(o => o.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Revenue (Paid)</h3>
          <div className="mt-2 text-3xl font-bold text-green-600">
            ${formatPrice(orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_cents, 0))}
          </div>
        </div>
      </div>
    </div>
  );
}