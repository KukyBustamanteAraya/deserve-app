'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DeleteButton } from './DeleteButton';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  status: string;
  hero_path: string | null;
  hero_url: string | null;
  sport_id: string;
  sports?: { name: string };
}

interface ProductsGridProps {
  products: Product[];
}

export default function ProductsGrid({ products }: ProductsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [sportFilter, setSportFilter] = useState(searchParams.get('sport') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  // Get unique sports and categories
  const uniqueSports = useMemo(() => {
    const sports = products
      .map((p) => p.sports?.name)
      .filter((name): name is string => !!name);
    return Array.from(new Set(sports)).sort();
  }, [products]);

  const uniqueCategories = useMemo(() => {
    const categories = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set(categories)).sort();
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.sports?.name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Sport filter
    if (sportFilter !== 'all') {
      filtered = filtered.filter((p) => p.sports?.name === sportFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price_cents - b.price_cents;
        case 'price-desc':
          return b.price_cents - a.price_cents;
        case 'newest':
        default:
          return 0; // Already sorted by created_at desc from server
      }
    });

    return filtered;
  }, [products, searchQuery, statusFilter, sportFilter, categoryFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((p) => p.status === 'active').length,
      draft: products.filter((p) => p.status === 'draft').length,
      archived: products.filter((p) => p.status === 'archived').length,
    };
  }, [products]);

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('admin-products-view') as 'grid' | 'list' | null;
    if (savedView) {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference
  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    localStorage.setItem('admin-products-view', newMode);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSportFilter('all');
    setCategoryFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || sportFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'newest';

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sportFilter !== 'all') params.set('sport', sportFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (sortBy !== 'newest') params.set('sort', sortBy);

    const newUrl = params.toString() ? `?${params.toString()}` : '/admin/products';
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, statusFilter, sportFilter, categoryFilter, sortBy, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape to clear search/filters/modal
      if (e.key === 'Escape') {
        if (previewProduct) {
          setPreviewProduct(null);
        } else if (searchQuery) {
          setSearchQuery('');
        } else if (hasActiveFilters) {
          clearFilters();
        } else if (selectedProducts.size > 0) {
          setSelectedProducts(new Set());
          setShowBulkActions(false);
        }
      }

      // Ctrl/Cmd + A to select all (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        toggleSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, hasActiveFilters, selectedProducts]);

  // Bulk selection handlers
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredProducts.map((p) => p.id));
      setSelectedProducts(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedProducts.size} products? This cannot be undone.`)) {
      return;
    }

    try {
      // This would call your delete API for each selected product
      // For now, just show alert
      alert(`Would delete ${selectedProducts.size} products`);
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      alert('Error deleting products');
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      alert(`Would change ${selectedProducts.size} products to ${newStatus}`);
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      alert('Error updating products');
    }
  };

  const exportSelected = () => {
    const selectedData = filteredProducts.filter((p) => selectedProducts.has(p.id));
    const csv = [
      ['ID', 'Name', 'Slug', 'Category', 'Sport', 'Price', 'Status'].join(','),
      ...selectedData.map((p) =>
        [p.id, p.name, p.slug, p.category, p.sports?.name || '', p.price_cents / 100, p.status].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDuplicateProduct = async (product: Product) => {
    if (!confirm(`Duplicate "${product.name}"? This will create a new product with the same details.`)) {
      return;
    }

    try {
      // Redirect to new product page with prefilled data from the original product
      const params = new URLSearchParams({
        duplicate: product.id,
        name: `${product.name} (Copy)`,
        slug: `${product.slug}-copy`,
        category: product.category,
        price: (product.price_cents / 100).toString(),
        status: 'draft', // Set to draft by default
        sport_id: product.sport_id,
      });

      router.push(`/admin/products/new?${params.toString()}`);
    } catch (error) {
      alert('Error duplicating product');
      console.error(error);
    }
  };

  // Skeleton Loading Components
  const GridSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-700" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/2" />
            <div className="h-4 bg-gray-700 rounded w-2/3" />
            <div className="flex justify-between pt-3 border-t border-gray-700">
              <div className="h-8 bg-gray-700 rounded w-20" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-700 rounded" />
                <div className="h-8 w-8 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const ListSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 flex animate-pulse">
          <div className="w-24 h-24 bg-gray-700" />
          <div className="flex-1 p-4 flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
            <div className="flex items-center gap-6">
              <div className="h-6 w-16 bg-gray-700 rounded-full" />
              <div className="h-8 w-24 bg-gray-700 rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-700 rounded" />
                <div className="h-8 w-8 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="text-gray-400 mt-1">Manage your product catalog</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-lg hover:shadow-blue-500/50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Product
        </Link>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-500/50 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">{selectedProducts.size} selected</span>
            <button
              onClick={() => {
                setSelectedProducts(new Set());
                setShowBulkActions(false);
              }}
              className="text-blue-200 hover:text-white text-sm"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) handleBulkStatusChange(e.target.value);
                e.target.value = '';
              }}
              className="px-4 py-2 bg-blue-800 border border-blue-600 text-white rounded-lg text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Change Status
              </option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <button
              onClick={exportSelected}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400">Draft</div>
          <div className="text-2xl font-bold text-gray-400">{stats.draft}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-400">Archived</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.archived}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
        {/* Select All Checkbox */}
        {filteredProducts.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-gray-700 cursor-pointer"
              />
              <span className="text-sm text-gray-300 group-hover:text-white">
                Select all {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </span>
            </label>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            />
            <svg
              className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'active', 'draft', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Sport Filter */}
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Sports</option>
            {uniqueSports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm capitalize"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((category) => (
              <option key={category} value={category} className="capitalize">
                {category}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low-High)</option>
            <option value="price-desc">Price (High-Low)</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results count, View Toggle, and Keyboard Shortcuts */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Showing {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
            <button
              onClick={toggleViewMode}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={toggleViewMode}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">⌘/Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">F</kbd>
            <span className="ml-1">Search</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">⌘/Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">A</kbd>
            <span className="ml-1">Select All</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">Esc</kbd>
            <span className="ml-1">Clear</span>
          </div>
        </div>
      </div>

      {/* Products grid */}
      {isLoading ? (
        viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
            <p className="text-gray-400 mb-6">
              {hasActiveFilters ? 'Try adjusting your filters or search query' : 'Get started by creating your first product'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-lg hover:shadow-blue-500/50"
              >
                Clear All Filters
              </button>
            ) : (
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-lg hover:shadow-blue-500/50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first product
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const isSelected = selectedProducts.has(product.id);
            return (
              <div
                key={product.id}
                className={`group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border overflow-hidden transition-all hover:shadow-2xl cursor-pointer flex ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-gray-700 hover:border-blue-500/50 hover:shadow-blue-500/20'
                }`}
                onClick={(e) => {
                  if (
                    (e.target as HTMLElement).closest('input, a, button') &&
                    !(e.target as HTMLElement).closest('.product-card-body')
                  ) {
                    return;
                  }
                  setPreviewProduct(product);
                }}
              >
                {/* Checkbox */}
                <div className="flex items-center p-4">
                  <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProductSelection(product.id)}
                      className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-gray-700 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Image */}
                <div className="w-24 h-24 bg-gray-900 flex-shrink-0">
                  {product.hero_url ? (
                    <img src={product.hero_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-4 product-card-body flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-1">{product.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>/{product.slug}</span>
                      <span>•</span>
                      <span className="capitalize">{product.category}</span>
                      <span>•</span>
                      <span>{product.sports?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Status */}
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        product.status === 'active'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                          : product.status === 'draft'
                          ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                      }`}
                    >
                      {product.status}
                    </span>

                    {/* Price */}
                    <div className="text-2xl font-bold text-blue-400 min-w-[120px] text-right">
                      ${(product.price_cents / 100).toLocaleString()}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateProduct(product);
                        }}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Link>
                      <DeleteButton productId={product.id} productName={product.name} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
          {filteredProducts.map((product) => {
            const isSelected = selectedProducts.has(product.id);
            return (
              <div
                key={product.id}
                className={`group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border overflow-hidden transition-all hover:shadow-2xl cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-gray-700 hover:border-blue-500/50 hover:shadow-blue-500/20'
                }`}
                onClick={(e) => {
                  // Don't open preview if clicking checkbox or action buttons
                  if (
                    (e.target as HTMLElement).closest('input, a, button') &&
                    !(e.target as HTMLElement).closest('.product-card-body')
                  ) {
                    return;
                  }
                  setPreviewProduct(product);
                }}
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-900 overflow-hidden">
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(product.id)}
                        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-gray-700 cursor-pointer shadow-lg"
                      />
                    </label>
                  </div>
                  {product.hero_url ? (
                    <img
                      src={product.hero_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                        product.status === 'active'
                          ? 'bg-green-500/90 text-white'
                          : product.status === 'draft'
                          ? 'bg-gray-500/90 text-white'
                          : 'bg-yellow-500/90 text-white'
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-5 product-card-body">
                  <div className="mb-3">
                    <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">/{product.slug}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <span className="capitalize">{product.category}</span>
                    <span className="text-gray-600">"</span>
                    <span>{product.sports?.name || 'Unknown'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div className="text-2xl font-bold text-blue-400">
                      ${(product.price_cents / 100).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateProduct(product);
                        }}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Link>
                      <DeleteButton productId={product.id} productName={product.name} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Preview Modal */}
      {previewProduct && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewProduct(null)}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white">{previewProduct.name}</h2>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    previewProduct.status === 'active'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                      : previewProduct.status === 'draft'
                      ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                  }`}
                >
                  {previewProduct.status}
                </span>
              </div>
              <button
                onClick={() => setPreviewProduct(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
                  {previewProduct.hero_url ? (
                    <img
                      src={previewProduct.hero_url}
                      alt={previewProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Price</label>
                    <div className="text-3xl font-bold text-blue-400">
                      ${(previewProduct.price_cents / 100).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Slug</label>
                    <div className="text-gray-300 font-mono text-sm bg-gray-800 px-3 py-2 rounded border border-gray-700">
                      /{previewProduct.slug}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Category</label>
                      <div className="text-white capitalize bg-gray-800 px-3 py-2 rounded border border-gray-700">
                        {previewProduct.category}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Sport</label>
                      <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                        {previewProduct.sports?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Product ID</label>
                    <div className="text-gray-400 text-xs font-mono">{previewProduct.id}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => {
                        handleDuplicateProduct(previewProduct);
                        setPreviewProduct(null);
                      }}
                      className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Duplicate
                    </button>
                    <Link
                      href={`/admin/products/${previewProduct.id}/edit`}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-center flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </Link>
                    <Link
                      href={`/products/${previewProduct.slug}`}
                      target="_blank"
                      className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      title="View on site"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
