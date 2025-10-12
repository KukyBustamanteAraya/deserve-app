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
  { value: 'short', label: 'Shorts', typeSlug: 'shorts' },
  { value: 'medias', label: 'Socks (Calcetines)', typeSlug: 'socks' },
  { value: 'chaqueta', label: 'Jacket (Chaqueta)', typeSlug: 'jacket' },
  { value: 'pantalon', label: 'Pants (Pantalón)', typeSlug: 'pants' },
  { value: 'bolso', label: 'Duffle Bag (Bolso)', typeSlug: 'bag' },
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
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">
          Product saved successfully! Redirecting...
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>

        {/* Sports (Multi-select with checkboxes) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Available for Sports <span className="text-blue-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Select all sports this product will be available for
          </p>
          <div className="grid grid-cols-2 gap-3">
            {sports.map((sport) => {
              const sportIdStr = String(sport.id);
              return (
                <label
                  key={sport.id}
                  className="flex items-center space-x-2 p-3 bg-gray-900 border border-gray-700 rounded-md hover:border-blue-500 cursor-pointer transition-colors"
                >
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
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-white">{sport.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Category <span className="text-blue-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Product Name <span className="text-blue-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Premium Jersey, Rugby Jersey, Team Hoodie"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Give this product a descriptive name (e.g., "Premium Jersey" for standard build, "Rugby Jersey" for reinforced)
          </p>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Price (CLP) <span className="text-blue-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="1"
              min="0"
              value={formData.price_cents}
              onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
              className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="50000"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Set the price for this specific product in Chilean Pesos (e.g., $50,000 CLP for Premium Jersey, $70,000 CLP for Rugby Jersey)
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Publication Status</h2>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Status <span className="text-blue-500">*</span>
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
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
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-blue-500/50"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
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
              Saving...
            </>
          ) : (
            <>{mode === 'create' ? 'Create Product' : 'Save Changes'}</>
          )}
        </button>
      </div>
    </form>
  );
}
