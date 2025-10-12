'use client';

import React, { useState, useTransition } from 'react';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface Order {
  id: string;
  user_id: string;
  team_id?: string;
  status: string;
  payment_status: string;
  currency: string;
  subtotal_cents: number;
  total_amount_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery_date?: string;
  profiles: {
    id: string;
    email: string;
  };
  teams?: {
    name: string;
  };
}

interface Props {
  initialOrders: Order[];
}

export default function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const supabase = getBrowserClient();

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
      case 'design_approved':
        return 'bg-green-100 text-green-800';
      case 'design_review':
        return 'bg-blue-100 text-blue-800';
      case 'design_changes':
        return 'bg-orange-100 text-orange-800';
      case 'production':
        return 'bg-purple-100 text-purple-800';
      case 'quality_check':
        return 'bg-indigo-100 text-indigo-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      paid: 'Paid',
      design_review: 'Design Review',
      design_approved: 'Design Approved',
      design_changes: 'Design Changes',
      production: 'In Production',
      quality_check: 'Quality Check',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      alert(`Order updated to ${getStatusLabel(newStatus)}`);
    } catch (error: any) {
      logger.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const updateShippingInfo = async (orderId: string, trackingNumber: string, carrier: string, estimatedDeliveryDate?: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber,
          carrier: carrier,
          estimated_delivery_date: estimatedDeliveryDate || null,
          status: 'shipped',
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, status: 'shipped', tracking_number: trackingNumber, carrier: carrier, estimated_delivery_date: estimatedDeliveryDate }
          : o
      ));

      alert('Shipping information updated and order marked as shipped');
    } catch (error: any) {
      logger.error('Error updating shipping info:', error);
      alert('Failed to update shipping information');
    }
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
              <React.Fragment key={order.id}>
                <tr>
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
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {expandedOrder === order.id ? 'Hide Details' : 'Manage Order'}
                    </button>
                  </td>
                </tr>
                {expandedOrder === order.id && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 bg-gray-50">
                    <div className="space-y-6">
                      {/* Order Timeline */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Order Status Timeline</h3>
                        <OrderStatusTimeline
                          currentStatus={order.status}
                          trackingNumber={order.tracking_number}
                          carrier={order.carrier}
                          estimatedDeliveryDate={order.estimated_delivery_date}
                        />
                      </div>

                      {/* Status Update Controls */}
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4">Update Order Status</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { status: 'pending', label: 'Pending' },
                            { status: 'paid', label: 'Paid' },
                            { status: 'design_review', label: 'Design Review' },
                            { status: 'design_approved', label: 'Design Approved' },
                            { status: 'production', label: 'In Production' },
                            { status: 'quality_check', label: 'Quality Check' },
                            { status: 'shipped', label: 'Shipped' },
                            { status: 'delivered', label: 'Delivered' },
                          ].map(({ status, label }) => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(order.id, status)}
                              disabled={order.status === status}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                order.status === status
                                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Information Form */}
                      {order.status === 'production' || order.status === 'quality_check' ? (
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4">Add Shipping Information</h3>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              updateShippingInfo(
                                order.id,
                                formData.get('trackingNumber') as string,
                                formData.get('carrier') as string,
                                formData.get('estimatedDeliveryDate') as string
                              );
                            }}
                            className="grid grid-cols-1 md:grid-cols-4 gap-4"
                          >
                            <input
                              type="text"
                              name="trackingNumber"
                              placeholder="Tracking Number"
                              required
                              className="px-3 py-2 border rounded-lg"
                            />
                            <select name="carrier" required className="px-3 py-2 border rounded-lg">
                              <option value="">Select Carrier</option>
                              <option value="Chilexpress">Chilexpress</option>
                              <option value="Correos Chile">Correos Chile</option>
                              <option value="Starken">Starken</option>
                              <option value="Blue Express">Blue Express</option>
                            </select>
                            <input
                              type="date"
                              name="estimatedDeliveryDate"
                              placeholder="Est. Delivery"
                              className="px-3 py-2 border rounded-lg"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                              Ship Order
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {/* Order Details */}
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-2">Order Details</h3>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="font-medium text-gray-600">Order ID</dt>
                            <dd className="text-gray-900 font-mono">{order.id}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-600">Team</dt>
                            <dd className="text-gray-900">{order.teams?.name || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-600">Payment Status</dt>
                            <dd className="text-gray-900">{order.payment_status}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-600">Total Amount</dt>
                            <dd className="text-gray-900 font-semibold">${formatPrice(order.total_amount_cents || order.total_cents)}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </td>
                </tr>
                )}
              </React.Fragment>
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