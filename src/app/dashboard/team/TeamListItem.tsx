'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface TeamListItemProps {
  team: {
    id: string;
    name: string;
    created_at: string;
    sports?: { name: string } | null;
  };
}

export function TeamListItem({ team }: TeamListItemProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = getBrowserClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`¿Estás seguro de que quieres eliminar "${team.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (error) throw error;

      // Refresh the page to show updated list
      router.refresh();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error al eliminar el equipo. Por favor intenta de nuevo.');
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all">
      <Link
        href={`/dashboard/team/${team.id}`}
        className="flex-1 flex justify-between items-center"
      >
        <div>
          <p className="font-medium text-gray-900">{team.name}</p>
          <p className="text-sm text-gray-600">{team.sports?.name || 'Unknown Sport'}</p>
          <p className="text-xs text-gray-400">
            Created {new Date(team.created_at).toLocaleDateString()}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Eliminar equipo"
      >
        {deleting ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </div>
  );
}
