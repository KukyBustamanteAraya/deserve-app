'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DeleteButton } from './DeleteButton';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_clp: number;
  status: string;
  hero_path: string | null;
  hero_url: string | null;
  icon_url: string | null;
  sport_id?: string;
  sport_ids: number[];
  sports?: { name: string };
  sport_names?: string[];
}

interface Sport {
  id: number;
  name: string;
  slug: string;
}

interface ProductsGridProps {
  products: Product[];
}

export default function ProductsGrid({ products }: ProductsGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [uploadingIconFor, setUploadingIconFor] = useState<string | null>(null);
  const [iconPreviews, setIconPreviews] = useState<Record<string, string>>({});

  // Fetch all sports on mount
  useEffect(() => {
    async function fetchSports() {
      try {
        const response = await fetch('/api/sports');
        const result = await response.json();
        setAllSports(result.data.items || []);
      } catch (error) {
        console.error('Error fetching sports:', error);
      }
    }
    fetchSports();
  }, []);

  const filteredProducts = products;

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      slug: product.slug,
      category: product.category,
      price_clp: product.price_clp,
      status: product.status,
      sport_ids: product.sport_ids || [],
    });
  };

  const handleNameChange = (name: string) => {
    setEditForm({
      ...editForm,
      name,
      slug: generateSlug(name)
    });
  };

  const toggleSport = (sportId: number) => {
    const currentSportIds = editForm.sport_ids || [];
    const newSportIds = currentSportIds.includes(sportId)
      ? currentSportIds.filter(id => id !== sportId)
      : [...currentSportIds, sportId];
    setEditForm({ ...editForm, sport_ids: newSportIds });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (productId: string) => {
    setSaving(true);
    try {
      console.log('Sending PATCH with data:', editForm);
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to update product');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (productId: string, file: File) => {
    if (!file) return;

    setUploadingIconFor(productId);
    try {
      // Upload the icon
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId);

      const uploadResponse = await fetch('/api/admin/products/upload-icon', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload icon');
      }

      const { url } = await uploadResponse.json();

      // Update preview immediately
      setIconPreviews(prev => ({ ...prev, [productId]: url }));

      // Save the icon URL to the product
      const updateResponse = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon_url: url }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to save icon URL');
      }

      // Refresh to show updated icon
      window.location.reload();
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Failed to upload product icon');
    } finally {
      setUploadingIconFor(null);
    }
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 max-w-7xl mx-auto">
      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 sm:p-8 md:p-12 text-center shadow-2xl group">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2 relative">No products found</h3>
          <p className="text-gray-400 mb-4 sm:mb-6 relative text-sm sm:text-base">
            Get started by creating your first product
          </p>
          <Link
            href="/admin/products/new"
            className="relative inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-sm sm:text-base"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="relative">Create your first product</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const isEditing = editingId === product.id;

            return (
              <div
                key={product.id}
                className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-3 hover:border-[#e21c21]/50 transition-all group"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative space-y-1.5">
                  {isEditing ? (
                    // EDIT MODE
                    <>
                      {/* Name Input with auto-generated slug below */}
                      <div>
                        <label className="text-xs text-gray-400 mb-0.5 block">Name</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => handleNameChange(e.target.value)}
                          className="w-full px-2 py-1 bg-black/50 border border-gray-600 rounded text-white text-sm focus:ring-1 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
                        />
                        <p className="text-xs text-gray-500 mt-0.5">/{editForm.slug || 'auto-generated'}</p>
                      </div>

                      {/* Category and Status */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-xs text-gray-400 mb-0.5 block">Category</label>
                          <select
                            value={editForm.category || ''}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-2 py-1 bg-black/50 border border-gray-600 rounded text-white text-sm focus:ring-1 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
                          >
                            <option value="">Select category</option>
                            <option value="camiseta">Jersey (Camiseta)</option>
                            <option value="poleron">Hoodie (Poleron)</option>
                            <option value="medias">Socks (Calcetines)</option>
                            <option value="chaqueta">Jacket (Chaqueta)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-0.5 block">Status</label>
                          <select
                            value={editForm.status || 'draft'}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full px-2 py-1 bg-black/50 border border-gray-600 rounded text-white text-sm focus:ring-1 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      {/* Price Input */}
                      <div>
                        <label className="text-xs text-gray-400 mb-0.5 block">Price (CLP)</label>
                        <input
                          type="number"
                          value={editForm.price_clp || 0}
                          onChange={(e) => setEditForm({ ...editForm, price_clp: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1 bg-black/50 border border-gray-600 rounded text-white text-sm focus:ring-1 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
                        />
                      </div>

                      {/* Sports Selector */}
                      <div>
                        <label className="text-xs text-gray-400 mb-0.5 block">Sports</label>
                        <div className="flex flex-wrap gap-1">
                          {allSports.map((sport) => {
                            const isSelected = (editForm.sport_ids || []).includes(sport.id);
                            return (
                              <button
                                key={sport.id}
                                type="button"
                                onClick={() => toggleSport(sport.id)}
                                className={`px-2 py-0.5 text-xs rounded-full transition-all ${
                                  isSelected
                                    ? 'bg-[#e21c21]/30 text-[#e21c21] border border-[#e21c21]/50'
                                    : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-gray-500'
                                }`}
                              >
                                {sport.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleSave(product.id)}
                          disabled={saving}
                          className="flex-1 px-2 py-1 bg-gradient-to-br from-green-600/90 to-green-700/90 text-white rounded-lg text-xs font-semibold hover:from-green-500/90 hover:to-green-600/90 transition-all disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="flex-1 px-2 py-1 bg-gradient-to-br from-gray-600/90 to-gray-700/90 text-white rounded-lg text-xs font-semibold hover:from-gray-500/90 hover:to-gray-600/90 transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    // VIEW MODE
                    <>
                      {/* Header with Name, Icon Upload, and Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base text-white truncate">{product.name}</h3>
                            <p className="text-xs text-gray-500">/{product.slug}</p>
                          </div>

                          {/* Product Icon Upload Box */}
                          <label className="relative w-12 h-12 border-2 border-dashed border-gray-600 hover:border-[#e21c21]/50 rounded-lg flex items-center justify-center cursor-pointer transition-all bg-black/30 flex-shrink-0 group/icon">
                            {uploadingIconFor === product.id ? (
                              <div className="w-4 h-4 border-2 border-[#e21c21] border-t-transparent rounded-full animate-spin"></div>
                            ) : (iconPreviews[product.id] || product.icon_url) ? (
                              <img
                                src={iconPreviews[product.id] || product.icon_url || ''}
                                alt="Product icon"
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <svg className="w-5 h-5 text-gray-600 group-hover/icon:text-[#e21c21] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIconUpload(product.id, file);
                              }}
                              disabled={uploadingIconFor === product.id}
                            />
                          </label>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                            product.status === 'active'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                              : product.status === 'draft'
                              ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                          }`}
                        >
                          {product.status}
                        </span>
                      </div>

                      {/* Category */}
                      <div className="text-xs text-gray-400">
                        <span className="capitalize">{product.category}</span>
                      </div>

                      {/* Sports Tags */}
                      {product.sport_names && product.sport_names.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.sport_names.map((sportName, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs rounded-full bg-[#e21c21]/20 text-[#e21c21] border border-[#e21c21]/50"
                            >
                              {sportName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-lg font-bold text-white">
                          ${product.price_clp.toLocaleString()} CLP
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(product)}
                            className="relative px-2 py-1 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn flex items-center gap-1"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                            <svg className="w-3 h-3 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            <span className="relative">Edit</span>
                          </button>
                          <DeleteButton productId={product.id} productName={product.name} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Product Card */}
          <Link
            href="/admin/products/new"
            className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl border-2 border-dashed border-gray-600 hover:border-[#e21c21]/50 p-3 transition-all group flex items-center justify-center min-h-[140px]"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e21c21]/20 via-[#c11a1e]/10 to-[#a01519]/20 border border-[#e21c21]/30 flex items-center justify-center group-hover:border-[#e21c21]/50 transition-all">
                <svg className="w-6 h-6 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-gray-400 text-sm font-medium group-hover:text-white transition-colors">Add Product</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
