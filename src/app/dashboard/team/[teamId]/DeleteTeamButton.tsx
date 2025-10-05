'use client';

import { useState, useTransition } from 'react';
import { deleteTeamAction } from './actions';

interface DeleteTeamButtonProps {
  teamId: string;
  teamName: string;
}

export function DeleteTeamButton({ teamId, teamName }: DeleteTeamButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTeamAction(teamId);
      } catch (err: any) {
        setError(err?.message || 'Failed to delete team');
        setShowConfirm(false);
      }
    });
  };

  if (showConfirm) {
    return (
      <div className="space-y-4 pt-4 border-t">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium mb-2">Are you sure?</p>
          <p className="text-red-700 text-sm mb-4">
            This will permanently delete <strong>{teamName}</strong> and all associated data. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isPending ? 'Deleting...' : 'Yes, Delete Team'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
      >
        Delete Team
      </button>
      <p className="text-xs text-gray-500 mt-2">
        This action cannot be undone. All team data will be permanently deleted.
      </p>
    </div>
  );
}
