'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from './ImageUploader';
import { slugify } from '@/lib/utils/slugify';

interface Sport {
  id: string;
  name: string;
}

interface ProductFormData {
  sport_id: string;
  category: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  status: string;
  tags: string[];
}

interface ImageData {
  tempFolderId: string;
  images: Array<{ index: number; path: string; alt: string }>;
  heroIndex: number | null;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productId?: string;
  mode: 'create' | 'edit';
}

const CATEGORIES = [
  { value: 'camiseta', label: 'Camiseta (Jersey)' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'poleron', label: 'Poleron (Hoodie)' },
  { value: 'medias', label: 'Medias (Socks)' },
  { value: 'chaqueta', label: 'Chaqueta (Jacket)' },
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
    sport_id: initialData?.sport_id || '',
    category: initialData?.category || '',
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    price_cents: initialData?.price_cents || 0,
    status: initialData?.status || 'draft',
    tags: initialData?.tags || [],
  });
  const [priceDisplay, setPriceDisplay] = useState<string>(
    initialData?.price_cents ? String(initialData.price_cents / 100) : ''
  );
  const [tagsInput, setTagsInput] = useState<string>(
    initialData?.tags?.join(', ') || ''
  );
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [autoSlug, setAutoSlug] = useState(mode === 'create');
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
        setSports(data.sports || []);
      } catch (err: any) {
        console.error('Error fetching sports:', err);
      }
    }
    fetchSports();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData((prev) => ({ ...prev, slug: slugify(formData.name) }));
    }
  }, [formData.name, autoSlug]);

  // Update price cents when display changes
  useEffect(() => {
    const parsed = parseFloat(priceDisplay);
    if (!isNaN(parsed)) {
      setFormData((prev) => ({ ...prev, price_cents: Math.round(parsed * 100) }));
    }
  }, [priceDisplay]);

  // Update tags array when input changes
  useEffect(() => {
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    setFormData((prev) => ({ ...prev, tags }));
  }, [tagsInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.sport_id || !formData.category || !formData.name || formData.price_cents <= 0) {
        throw new Error('Please fill in all required fields');
      }

      // Active status validation for create mode
      if (formData.status === 'active' && mode === 'create') {
        if (!imageData || imageData.images.length === 0) {
          throw new Error('Para publicar como Activo, sube una imagen y selecciona una portada (Hero).');
        }

        // Auto-select first image as hero if none selected
        if (imageData.heroIndex === null || imageData.heroIndex === undefined) {
          imageData.heroIndex = 0;
        }
      }

      // Prepare payload
      const payload: any = {
        sport_id: formData.sport_id,
        category: formData.category,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price_cents: formData.price_cents,
        status: formData.status,
        tags: formData.tags,
      };

      // Include image data and temp folder ID for creation
      if (mode === 'create' && imageData) {
        // Set hero_path from the selected hero image
        const heroImage = imageData.images[imageData.heroIndex ?? 0];
        if (heroImage) {
          payload.hero_path = heroImage.path;
        }
        payload.imageData = imageData;
        payload.tempImageFolder = imageData.tempFolderId;
      }

      // API call
      const url = mode === 'create' ? '/api/catalog/products' : `/api/catalog/products/${productId}`;
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
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const canPublish = mode === 'create'
    ? imageData?.heroIndex !== null && imageData?.heroIndex !== undefined
    : true; // In edit mode, assume hero exists or will be validated by API

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {mode === 'create' ? 'Create New Product' : 'Edit Product'}
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
          Product saved successfully! Redirecting...
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

        {/* Sport */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Sport <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.sport_id}
            onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select a sport</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full border rounded px-3 py-2"
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
          <label className="block text-sm font-medium mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Soccer Jersey Home"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            URL Slug <span className="text-red-500">*</span>
            <label className="flex items-center gap-1 text-xs font-normal text-gray-600">
              <input
                type="checkbox"
                checked={autoSlug}
                onChange={(e) => setAutoSlug(e.target.checked)}
              />
              Auto-generate
            </label>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => {
              setAutoSlug(false);
              setFormData({ ...formData, slug: e.target.value });
            }}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., soccer-jersey-home"
            required
            disabled={autoSlug}
          />
          <p className="text-xs text-gray-500 mt-1">
            Preview: /products/{formData.slug || 'your-slug'}
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2 h-24"
            placeholder="Brief description of the product..."
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Price (CLP) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">$</span>
            <input
              type="number"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="45000"
              min="0"
              step="100"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Stored as: {formData.price_cents} cents
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-1">Tags</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="soccer, jersey, home (comma-separated)"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.tags.length > 0 ? `Tags: ${formData.tags.join(', ')}` : 'No tags'}
          </p>
        </div>
      </div>

      {/* Images Section (only for create mode) */}
      {mode === 'create' && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Product Images</h2>
          <ImageUploader onImagesChange={setImageData} />
          {!canPublish && formData.status === 'active' && (
            <p className="text-sm text-amber-600">
              ⚠️ You must select a hero image to publish this product.
            </p>
          )}
        </div>
      )}

      {/* Status */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Publication Status</h2>
        <div>
          <label className="block text-sm font-medium mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            disabled={formData.status === 'active' && !canPublish}
          >
            {STATUSES.map((status) => (
              <option
                key={status.value}
                value={status.value}
                disabled={status.value === 'active' && !canPublish}
              >
                {status.label}
                {status.value === 'active' && !canPublish ? ' (requires hero image)' : ''}
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
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading || (formData.status === 'active' && !canPublish)}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
