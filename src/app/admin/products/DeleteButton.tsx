'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeleteButtonProps {
  productId: string;
  productName: string;
}

export function DeleteButton({ productId, productName }: DeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete product');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="relative px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <span className="relative text-sm font-semibold">{isDeleting ? 'Deleting...' : 'Delete'}</span>
    </button>
  );
}
