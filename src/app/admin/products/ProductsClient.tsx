'use client';

import React, { useState, useTransition } from 'react';
import ImageManager from '@/components/admin/ImageManager';

interface Sport {
  id: string;
  slug: string;
  name: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  sports: Sport;
}

interface Props {
  initialProducts: Product[];
  sports: Sport[];
}

export default function ProductsClient({ initialProducts, sports }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [managingImagesProduct, setManagingImagesProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    sportId: '',
    name: '',
    slug: '',
    priceCents: '',
    description: '',
    active: true,
  });

  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      sportId: '',
      name: '',
      slug: '',
      priceCents: '',
      description: '',
      active: true,
    });
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      sportId: product.sports.id,
      name: product.name,
      slug: product.slug,
      priceCents: product.price_cents.toString(),
      description: product.description || '',
      active: product.active,
    });
    setEditingProduct(product);
    setError(null);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.slug || !formData.sportId || !formData.priceCents) {
      setError('Please fill in all required fields');
      return;
    }

    const priceCents = parseInt(formData.priceCents);
    if (isNaN(priceCents) || priceCents < 0) {
      setError('Price must be a valid number greater than or equal to 0');
      return;
    }

    startTransition(async () => {
      try {
        const url = editingProduct
          ? `/api/admin/products/${editingProduct.id}`
          : '/api/admin/products';
        const method = editingProduct ? 'PATCH' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sportId: formData.sportId,
            name: formData.name,
            slug: formData.slug,
            priceCents,
            description: formData.description || null,
            active: formData.active,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save product');
        }

        if (editingProduct) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? data.product : p));
        } else {
          setProducts(prev => [data.product, ...prev]);
        }

        closeModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete product');
        }

        setProducts(prev => prev.filter(p => p.id !== productId));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete product');
      }
    });
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <button
          onClick={openCreateModal}
          disabled={isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Add Product
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sport
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
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
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.slug}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.sports.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${formatPrice(product.price_cents)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => openEditModal(product)}
                    disabled={isPending}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setManagingImagesProduct(product)}
                    disabled={isPending}
                    className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                  >
                    Images
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No products found. Create your first product to get started.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingProduct ? 'Edit Product' : 'Create Product'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sport *
                </label>
                <select
                  value={formData.sportId}
                  onChange={(e) => setFormData(prev => ({ ...prev, sportId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select a sport</option>
                  {sports.map(sport => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  pattern="[a-z0-9-]+"
                  title="Use lowercase letters, numbers, and hyphens only"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (cents) *
                </label>
                <input
                  type="number"
                  value={formData.priceCents}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceCents: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter price in cents (e.g., 3500 for $35.00)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Management Modal */}
      {managingImagesProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Manage Product Images</h2>
              <button
                onClick={() => setManagingImagesProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ImageManager
                productId={managingImagesProduct.id}
                productName={managingImagesProduct.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}