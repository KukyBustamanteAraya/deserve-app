'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { OrderWithDetails, SizeBreakdown } from '@/types/clients';

interface OrderDetailPanelProps {
  order: OrderWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

const PROGRESS_STAGES = [
  { key: 'design', label: 'Diseño', statuses: ['pending', 'design_review', 'design_approved'] },
  { key: 'details', label: 'Detalles', statuses: ['design_changes', 'production', 'quality_check'] },
  { key: 'payment', label: 'Pago', statuses: ['paid'] },
  { key: 'delivery', label: 'Entrega', statuses: ['shipped', 'delivered'] },
];

const DESIGN_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'yellow' },
  { value: 'rendering', label: 'En proceso', color: 'blue' },
  { value: 'ready', label: 'Listo', color: 'green' },
  { value: 'cancelled', label: 'Cancelado', color: 'red' },
];

export default function OrderDetailPanel({ order, isOpen, onClose }: OrderDetailPanelProps) {
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!isOpen) return null;

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const handleMockupUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !order.design_request) return;

    setUploadingMockup(true);

    try {
      const formData = new FormData();
      formData.append('designRequestId', order.design_request.id);

      // Add all selected files
      Array.from(files).forEach((file, index) => {
        formData.append(`mockup_${index}`, file);
      });

      const response = await fetch('/api/admin/design-requests/upload-mockups', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload mockups');
      }

      const result = await response.json();
      alert(`Successfully uploaded ${result.uploadedCount} mockup(s)!`);

      // Refresh the page to show updated mockups
      window.location.reload();
    } catch (error) {
      console.error('Error uploading mockups:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error: ${errorMessage}`);
    } finally {
      setUploadingMockup(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order.design_request) return;

    setUpdatingStatus(true);

    try {
      const response = await fetch('/api/admin/design-requests/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: order.design_request.id,
          status: newStatus
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      alert('Status updated successfully!');
      // Refresh from server
      window.location.reload();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const currentStageIndex = PROGRESS_STAGES.findIndex((stage) => stage.key === order.progress_stage);

  const renderSizeBreakdown = (sizeBreakdown: SizeBreakdown | undefined | null) => {
    if (!sizeBreakdown) return null;

    const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl'] as const;
    const varonesTotal = sizes.reduce((sum, size) => sum + (sizeBreakdown.varones?.[size] || 0), 0);
    const damasTotal = sizes.reduce((sum, size) => sum + (sizeBreakdown.damas?.[size] || 0), 0);

    if (varonesTotal === 0 && damasTotal === 0) return null;

    return (
      <div className="mt-3 space-y-3">
        {/* Varones */}
        {varonesTotal > 0 && (
          <div>
            <div className="text-xs font-semibold text-blue-400 mb-2">Varones ({varonesTotal} units)</div>
            <div className="grid grid-cols-6 gap-2">
              {sizes.map((size) => {
                const qty = sizeBreakdown.varones?.[size] || 0;
                return (
                  <div
                    key={size}
                    className={`text-center p-2 rounded ${
                      qty > 0 ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-gray-800/30 border border-gray-700'
                    }`}
                  >
                    <div className="text-xs text-gray-400 uppercase">{size}</div>
                    <div className={`font-bold ${qty > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                      {qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Damas */}
        {damasTotal > 0 && (
          <div>
            <div className="text-xs font-semibold text-pink-400 mb-2">Damas ({damasTotal} units)</div>
            <div className="grid grid-cols-6 gap-2">
              {sizes.map((size) => {
                const qty = sizeBreakdown.damas?.[size] || 0;
                return (
                  <div
                    key={size}
                    className={`text-center p-2 rounded ${
                      qty > 0 ? 'bg-pink-500/20 border border-pink-500/30' : 'bg-gray-800/30 border border-gray-700'
                    }`}
                  >
                    <div className="text-xs text-gray-400 uppercase">{size}</div>
                    <div className={`font-bold ${qty > 0 ? 'text-pink-400' : 'text-gray-600'}`}>
                      {qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="relative w-full md:w-2/3 lg:w-1/2 bg-gradient-to-br from-gray-800/98 via-black/95 to-gray-900/98 backdrop-blur-md border-l border-gray-700 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700 p-6 z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">Order Details</h2>
              <p className="text-gray-400 text-sm">#{order.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Stages */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {PROGRESS_STAGES.map((stage, index) => (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        index <= currentStageIndex
                          ? 'bg-[#e21c21] text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div
                      className={`text-xs mt-1 font-medium ${
                        index <= currentStageIndex ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {stage.label}
                    </div>
                  </div>
                  {index < PROGRESS_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        index < currentStageIndex ? 'bg-[#e21c21]' : 'bg-gray-700'
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-bold mb-4">Order Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Status</div>
                <div className="text-white font-semibold">{order.status}</div>
              </div>
              <div>
                <div className="text-gray-400">Payment Status</div>
                <div className={`font-semibold ${
                  order.payment_status === 'paid' ? 'text-green-400' :
                  order.payment_status === 'partial' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {order.payment_status}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Payment Mode</div>
                <div className="text-white font-semibold">{order.payment_mode}</div>
              </div>
              <div>
                <div className="text-gray-400">Created</div>
                <div className="text-white font-semibold">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Total Amount</div>
                <div className="text-white font-bold text-lg">{formatCurrency(order.total_amount_cents)}</div>
              </div>
              <div>
                <div className="text-gray-400">Paid Amount</div>
                <div className="text-green-500 font-bold text-lg">{formatCurrency(order.paid_amount_cents)}</div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-white font-bold mb-4">Order Items ({order.items.length})</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{item.product_name}</h4>
                      {item.customization?.fabric_type && (
                        <div className="text-sm text-gray-400 mt-1">
                          Fabric: <span className="text-gray-300">{item.customization.fabric_type}</span>
                        </div>
                      )}
                      {item.customization?.age_group && (
                        <div className="text-sm text-gray-400">
                          Age Group: <span className="text-gray-300">{item.customization.age_group}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{formatCurrency(item.line_total_clp)}</div>
                      <div className="text-gray-400 text-sm">
                        {formatCurrency(item.unit_price_clp)} × {item.quantity}
                      </div>
                    </div>
                  </div>

                  {item.opted_out && (
                    <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1 inline-block">
                      Opted Out
                    </div>
                  )}

                  {/* Size Breakdown */}
                  {renderSizeBreakdown(item.customization?.size_breakdown)}
                </div>
              ))}
            </div>
          </div>

          {/* Design Request */}
          {order.design_request && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-bold mb-4">Design Request Management</h3>

              {/* Status Info and Quick Actions */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Current Status</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    order.design_request.status === 'ready' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                    order.design_request.status === 'rendering' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' :
                    order.design_request.status === 'cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                  }`}>
                    {DESIGN_STATUS_OPTIONS.find(s => s.value === order.design_request!.status)?.label || order.design_request.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-xs mb-1">Created</div>
                  <div className="text-white text-sm">{new Date(order.design_request.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Update Status */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Update Status</h4>
                <div className="flex gap-2 flex-wrap">
                  {DESIGN_STATUS_OPTIONS.map((statusOption) => (
                    <button
                      key={statusOption.value}
                      onClick={() => handleStatusUpdate(statusOption.value)}
                      disabled={updatingStatus || order.design_request!.status === statusOption.value}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        order.design_request!.status === statusOption.value
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : statusOption.color === 'green'
                          ? 'bg-green-500/90 hover:bg-green-500 text-white'
                          : statusOption.color === 'blue'
                          ? 'bg-blue-500/90 hover:bg-blue-500 text-white'
                          : statusOption.color === 'red'
                          ? 'bg-red-500/90 hover:bg-red-500 text-white'
                          : 'bg-yellow-500/90 hover:bg-yellow-500 text-white'
                      }`}
                    >
                      {statusOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Mockups */}
              {order.design_request.mockup_urls && order.design_request.mockup_urls.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">
                    Current Mockups ({order.design_request.mockup_urls.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {order.design_request.mockup_urls.map((url, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={url}
                          alt={`Mockup ${index + 1}`}
                          width={200}
                          height={200}
                          className="rounded-lg border-2 border-gray-600 w-full h-32 object-cover hover:border-[#e21c21] transition-colors"
                        />
                        <div className="absolute top-2 right-2 bg-gray-900/90 text-white text-xs px-2 py-1 rounded">
                          #{index + 1}
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Mockups */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Upload New Mockups</h4>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    id={`mockup-upload-${order.id}`}
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMockupUpload(e.target.files)}
                    disabled={uploadingMockup}
                    className="hidden"
                  />
                  <label
                    htmlFor={`mockup-upload-${order.id}`}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all ${
                      uploadingMockup
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-br from-green-500/90 via-green-600/80 to-green-700/90 text-white hover:shadow-lg hover:shadow-green-500/30'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>{uploadingMockup ? 'Uploading...' : 'Upload Mockup Images'}</span>
                  </label>
                  <p className="text-xs text-gray-500">
                    💡 Select one or more images (JPG, PNG). After uploading, change status to &quot;Listo&quot; so the customer can review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payments */}
          {order.payments && order.payments.length > 0 && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-bold mb-4">Payment Contributions ({order.payments.length})</h3>
              <div className="space-y-2">
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
                  >
                    <div className="flex-1">
                      <div className="text-white text-sm">{payment.profiles?.email || payment.user_id.slice(0, 8)}</div>
                      <div className="text-gray-400 text-xs">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{formatCurrency(payment.amount_cents)}</div>
                      <div className={`text-xs ${
                        payment.status === 'approved' || payment.status === 'paid' ? 'text-green-400' :
                        payment.status === 'pending' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {payment.status}
                      </div>
                    </div>
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
