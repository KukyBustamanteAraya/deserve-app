'use client';

import { useState, useEffect } from 'react';
import type { DesignRequest } from '@/types/design';

export default function DesignPage({ params }: { params: { teamId: string } }) {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [params.teamId]);

  const loadRequests = async () => {
    try {
      const res = await fetch(`/api/design-requests?teamId=${params.teamId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load design requests');
        return;
      }

      setRequests(data?.data?.items ?? []);
    } catch (err) {
      setError('Failed to load design requests');
    }
  };

  const handleCreateRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/design-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: params.teamId, brief }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create design request');
        return;
      }

      setBrief('');
      await loadRequests();
    } catch (err) {
      setError('Failed to create design request');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: number, status: string) => {
    try {
      const res = await fetch(`/api/design-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update status');
        return;
      }

      await loadRequests();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Design Requests</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Create new request */}
      <div className="mb-8 p-6 border rounded-lg bg-white shadow">
        <h2 className="text-xl font-semibold mb-4">Create New Request</h2>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Design brief (optional)..."
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 min-h-32"
        />
        <button
          onClick={handleCreateRequest}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? 'Creating...' : 'Create Request'}
        </button>
      </div>

      {/* List existing requests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Existing Requests</h2>
        {requests.length === 0 ? (
          <p className="text-gray-500">No design requests yet.</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="p-4 border rounded-lg bg-white shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm text-gray-500">Request #{request.id}</span>
                  <span
                    className={`ml-3 px-2 py-1 text-xs rounded ${
                      request.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : request.status === 'voting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>

              {request.brief && (
                <p className="text-sm text-gray-700 mb-3">{request.brief}</p>
              )}

              {request.status === 'open' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleUpdateStatus(request.id, 'voting')}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Start Voting
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}

              {request.status === 'voting' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
