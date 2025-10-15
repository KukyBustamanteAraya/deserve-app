'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/slugify';
import { logger } from '@/lib/logger';

interface Sport {
  id: number;  // Supabase returns numeric IDs
  name: string;
}

interface ProductFormData {
  sport_ids: string[];                    // Array of sport IDs
  category: string;
  name: string;
  price_cents: number | string;           // Custom price for this product
  status: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productId?: string;
  mode: 'create' | 'edit';
}

// Map user-friendly labels to database constraint-allowed values
// The DB constraint only allows: 'camiseta', 'poleron', 'medias', 'chaqueta'
// We'll set product_type_slug separately to the correct English values
const CATEGORIES = [
  { value: 'camiseta', label: 'Jersey (Camiseta)', typeSlug: 'jersey' },
  { value: 'poleron', label: 'Hoodie (Poleron)', typeSlug: 'hoodie' },
  { value: 'medias', label: 'Socks (Calcetines)', typeSlug: 'socks' },
  { value: 'chaqueta', label: 'Jacket (Chaqueta)', typeSlug: 'jacket' },
];

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export default function ProductForm({ initialData, productId, mode }: ProductFormProps) {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    sport_ids: initialData?.sport_ids || [],
    category: initialData?.category || '',
    name: initialData?.name || '',
    price_cents: initialData?.price_cents || '',
    status: initialData?.status || 'draft',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch sports on mount
  useEffect(() => {
    async function fetchSports() {
      try {
        const response = await fetch('/api/sports');
        if (!response.ok) throw new Error('Failed to fetch sports');
        const data = await response.json();
        setSports(data.data?.items || []);
      } catch (err: any) {
        logger.error('Error fetching sports:', err);
      }
    }
    fetchSports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (formData.sport_ids.length === 0) {
        throw new Error('Please select at least one sport');
      }
      if (!formData.category || !formData.name) {
        throw new Error('Please fill in all required fields');
      }
      if (!formData.price_cents || Number(formData.price_cents) <= 0) {
        throw new Error('Please enter a valid price');
      }

      // Auto-generate slug from name
      const slug = slugify(formData.name);

      // Get the typeSlug from the selected category
      const selectedCategory = CATEGORIES.find(cat => cat.value === formData.category);
      const typeSlug = selectedCategory?.typeSlug || formData.category;

      // Convert price to number (Chilean Pesos - no decimal conversion needed)
      const priceCents = typeof formData.price_cents === 'string'
        ? Math.round(parseFloat(formData.price_cents))
        : formData.price_cents;

      // Prepare payload with deduplication
      const sportIdsNumbers = formData.sport_ids.map(id => parseInt(id));
      const uniqueSportIds = Array.from(new Set(sportIdsNumbers)); // Remove duplicates

      const payload: any = {
        sport_ids: uniqueSportIds,
        category: formData.category,
        name: formData.name,
        slug,
        price_cents: priceCents,
        status: formData.status,
        product_type_slug: typeSlug,
      };

      // API call
      const url = mode === 'create' ? '/api/admin/products' : `/api/admin/products/${productId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save product');
      }

      const result = await response.json();
      setSuccess(true);

      // Redirect after success
      setTimeout(() => {
        router.push('/admin/products');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      logger.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {mode === 'create' ? 'Create New Product' : 'Edit Product'}
          </h1>
          <p className="text-gray-400 mt-1">
            {mode === 'create'
              ? 'Add a new product to your catalog'
              : 'Update product details'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="relative px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-[#e21c21]/50 transition-all overflow-hidden group"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">Cancel</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="relative bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40 backdrop-blur-md border border-red-500/50 text-red-300 px-4 py-3 rounded-lg shadow-lg overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="relative">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="relative bg-gradient-to-br from-green-900/40 via-green-800/30 to-green-900/40 backdrop-blur-md border border-green-500/50 text-green-300 px-4 py-3 rounded-lg shadow-lg overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="relative">Product saved successfully! Redirecting...</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl space-y-4 group">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h2 className="text-xl font-semibold text-white mb-4 relative">Basic Information</h2>

        {/* Sports (Multi-select with checkboxes) */}
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-2">
            Available for Sports <span className="text-[#e21c21]">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Select all sports this product will be available for
          </p>
          <div className="grid grid-cols-2 gap-3">
            {sports.map((sport) => {
              const sportIdStr = String(sport.id);
              return (
                <label
                  key={sport.id}
                  className="relative flex items-center space-x-2 p-3 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-md hover:border-[#e21c21]/50 cursor-pointer transition-all overflow-hidden group/checkbox"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/checkbox:opacity-100 transition-opacity pointer-events-none"></div>
                  <input
                    type="checkbox"
                    checked={formData.sport_ids.includes(sportIdStr)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, sport_ids: [...formData.sport_ids, sportIdStr] });
                      } else {
                        setFormData({ ...formData, sport_ids: formData.sport_ids.filter(id => id !== sportIdStr) });
                      }
                    }}
                    className="relative w-4 h-4 text-[#e21c21] bg-gray-800 border-gray-600 rounded focus:ring-2 focus:ring-[#e21c21]/50"
                  />
                  <span className="text-white relative">{sport.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Category */}
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-1">
            Category <span className="text-[#e21c21]">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
            required
          >
            <option value="" className="bg-black text-white">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-black text-white">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-1">
            Product Name <span className="text-[#e21c21]">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
            placeholder="e.g., Premium Jersey, Rugby Jersey, Team Hoodie"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Give this product a descriptive name (e.g., "Premium Jersey" for standard build, "Rugby Jersey" for reinforced)
          </p>
        </div>

        {/* Price */}
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-1">
            Price (CLP) <span className="text-[#e21c21]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="1"
              min="0"
              value={formData.price_cents}
              onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
              className="w-full pl-8 pr-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
              placeholder="50000"
              required
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Set the price for this specific product in Chilean Pesos (e.g., $50,000 CLP for Premium Jersey, $70,000 CLP for Rugby Jersey)
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl space-y-4 group">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h2 className="text-xl font-semibold text-white mb-4 relative">Publication Status</h2>
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-1">
            Status <span className="text-[#e21c21]">*</span>
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
            required
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value} className="bg-black text-white">
                {status.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {formData.status === 'draft' && 'Draft products are not visible to users'}
            {formData.status === 'active' && 'Active products are visible in the catalog'}
            {formData.status === 'archived' && 'Archived products are hidden but not deleted'}
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="relative px-6 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-[#e21c21]/50 transition-all overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          disabled={loading}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">Cancel</span>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="relative px-6 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 relative"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="relative">Saving...</span>
            </>
          ) : (
            <span className="relative">{mode === 'create' ? 'Create Product' : 'Save Changes'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
