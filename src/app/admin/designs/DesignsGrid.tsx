'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Design {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  created_at: string;
  mockup_count?: number;
  available_sports?: string[];
  available_product_types?: string[];
  primary_mockup_url?: string | null;
}

interface DesignsGridProps {
  designs: Design[];
}

export default function DesignsGrid({ designs }: DesignsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [featuredFilter, setFeaturedFilter] = useState(searchParams.get('featured') || 'all');
  const [sportFilter, setSportFilter] = useState(searchParams.get('sport') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [productTypeFilter, setProductTypeFilter] = useState(searchParams.get('product_type') || 'all');
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<Design | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  // Get unique sports from designs
  const uniqueSports = useMemo(() => {
    const sports = designs
      .flatMap((d) => d.available_sports || [])
      .filter((s): s is string => !!s);
    return Array.from(new Set(sports)).sort();
  }, [designs]);

  // Get unique product types from designs
  const uniqueProductTypes = useMemo(() => {
    const types = designs
      .flatMap((d) => d.available_product_types || [])
      .filter((t): t is string => !!t);
    return Array.from(new Set(types)).sort();
  }, [designs]);

  // Filtered and sorted designs
  const filteredDesigns = useMemo(() => {
    let filtered = [...designs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.slug.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.designer_name?.toLowerCase().includes(query) ||
          d.style_tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          d.color_scheme?.some((color) => color.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((d) => d.active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((d) => !d.active);
    }

    // Featured filter
    if (featuredFilter === 'featured') {
      filtered = filtered.filter((d) => d.featured);
    } else if (featuredFilter === 'not-featured') {
      filtered = filtered.filter((d) => !d.featured);
    }

    // Sport filter
    if (sportFilter !== 'all') {
      filtered = filtered.filter((d) => d.available_sports?.includes(sportFilter));
    }

    // Product type filter
    if (productTypeFilter !== 'all') {
      filtered = filtered.filter((d) => d.available_product_types?.includes(productTypeFilter));
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'featured':
          if (a.featured === b.featured) return 0;
          return a.featured ? -1 : 1;
        case 'newest':
        default:
          return 0; // Already sorted by created_at desc from server
      }
    });

    return filtered;
  }, [designs, searchQuery, statusFilter, featuredFilter, sportFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: designs.length,
      active: designs.filter((d) => d.active).length,
      inactive: designs.filter((d) => !d.active).length,
      featured: designs.filter((d) => d.featured).length,
    };
  }, [designs]);

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('admin-designs-view') as 'grid' | 'list' | null;
    if (savedView) {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference
  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    localStorage.setItem('admin-designs-view', newMode);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFeaturedFilter('all');
    setSportFilter('all');
    setProductTypeFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || featuredFilter !== 'all' || sportFilter !== 'all' || productTypeFilter !== 'all' || sortBy !== 'newest';

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (featuredFilter !== 'all') params.set('featured', featuredFilter);
    if (sportFilter !== 'all') params.set('sport', sportFilter);
    if (productTypeFilter !== 'all') params.set('product_type', productTypeFilter);
    if (sortBy !== 'newest') params.set('sort', sortBy);

    const newUrl = params.toString() ? `?${params.toString()}` : '/admin/designs';
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, statusFilter, featuredFilter, sportFilter, productTypeFilter, sortBy, router]);

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
        if (previewDesign) {
          setPreviewDesign(null);
        } else if (searchQuery) {
          setSearchQuery('');
        } else if (hasActiveFilters) {
          clearFilters();
        } else if (selectedDesigns.size > 0) {
          setSelectedDesigns(new Set());
          setShowBulkActions(false);
        }
      }

      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        toggleSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, hasActiveFilters, selectedDesigns, previewDesign]);

  // Bulk selection handlers
  const toggleDesignSelection = (designId: string) => {
    const newSelection = new Set(selectedDesigns);
    if (newSelection.has(designId)) {
      newSelection.delete(designId);
    } else {
      newSelection.add(designId);
    }
    setSelectedDesigns(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedDesigns.size === filteredDesigns.length) {
      setSelectedDesigns(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredDesigns.map((d) => d.id));
      setSelectedDesigns(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedDesigns.size} designs? This cannot be undone.`)) {
      return;
    }

    try {
      alert(`Would delete ${selectedDesigns.size} designs`);
      setSelectedDesigns(new Set());
      setShowBulkActions(false);
    } catch (error) {
      alert('Error deleting designs');
    }
  };

  const handleBulkToggleFeatured = async () => {
    try {
      alert(`Would toggle featured for ${selectedDesigns.size} designs`);
      setSelectedDesigns(new Set());
      setShowBulkActions(false);
    } catch (error) {
      alert('Error updating designs');
    }
  };

  const exportSelected = () => {
    const selectedData = filteredDesigns.filter((d) => selectedDesigns.has(d.id));
    const csv = [
      ['ID', 'Name', 'Slug', 'Active', 'Featured', 'Sports', 'Mockups'].join(','),
      ...selectedData.map((d) =>
        [
          d.id,
          d.name,
          d.slug,
          d.active ? 'Yes' : 'No',
          d.featured ? 'Yes' : 'No',
          d.available_sports?.join(';') || '',
          d.mockup_count || 0,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `designs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDuplicateDesign = async (design: Design) => {
    if (!confirm(`Duplicate "${design.name}"?`)) {
      return;
    }

    try {
      router.push(`/admin/designs/new?duplicate=${design.id}`);
    } catch (error) {
      alert('Error duplicating design');
      logger.error(error);
    }
  };

  const handleDeleteDesign = async (design: Design) => {
    if (!confirm(`Delete "${design.name}"? This will also delete all mockups.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/designs/${design.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete design');
      }

      // Refresh page
      router.refresh();
    } catch (error) {
      alert('Error deleting design');
      logger.error(error);
    }
  };

  // Sport icon helper
  const getSportIcon = (sport: string) => {
    const icons: Record<string, string> = {
      futbol: '⚽',
      basquetbol: '🏀',
      voleibol: '🏐',
      rugby: '🏉',
    };
    return icons[sport] || '🎯';
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-[#e21c21]/50 rounded-xl shadow-2xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex items-center gap-3 sm:gap-4 relative">
            <span className="text-white font-medium text-sm sm:text-base">{selectedDesigns.size} selected</span>
            <button
              onClick={() => {
                setSelectedDesigns(new Set());
                setShowBulkActions(false);
              }}
              className="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2 relative flex-wrap">
            <button
              onClick={handleBulkToggleFeatured}
              className="relative px-4 py-2 bg-gradient-to-br from-yellow-500/90 via-yellow-600/80 to-yellow-700/90 backdrop-blur-md text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 border border-yellow-500/50 overflow-hidden group/btn"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Toggle Featured</span>
            </button>
            <button
              onClick={exportSelected}
              className="relative px-4 py-2 bg-gradient-to-br from-green-500/90 via-green-600/80 to-green-700/90 backdrop-blur-md text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 border border-green-500/50 overflow-hidden group/btn flex items-center gap-2"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <svg className="w-4 h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="relative">Export CSV</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="relative px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all text-sm font-semibold overflow-hidden group/btn flex items-center gap-2"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <svg className="w-4 h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="relative">Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Minimal Search and Filters */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search designs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 pl-9 sm:pl-10 bg-black/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 placeholder-gray-500 text-xs sm:text-sm"
            />
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg text-xs sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Draft</option>
            </select>

            {/* Sport Filter */}
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg text-xs sm:text-sm"
            >
              <option value="all">All Sports</option>
              {uniqueSports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg text-xs sm:text-sm"
            >
              <option value="newest">Newest</option>
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
              <option value="featured">Featured</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2 sm:px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/30 text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Category Toggles and New Design Button */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Category Toggles */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setProductTypeFilter('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                productTypeFilter === 'all'
                  ? 'bg-[#e21c21] text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700'
              }`}
            >
              All
            </button>
            {uniqueProductTypes.map((type) => (
              <button
                key={type}
                onClick={() => setProductTypeFilter(type)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium capitalize transition-all ${
                  productTypeFilter === type
                    ? 'bg-[#e21c21] text-white'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* New Design Button */}
          <Link
            href="/admin/designs/new"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#e21c21] text-white rounded-lg text-xs sm:text-sm font-medium transition-all hover:bg-[#c11a1e] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Design
          </Link>
        </div>
      </div>

      {/* Results count and View Toggle */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div className="text-xs sm:text-sm text-gray-400">
          Showing {filteredDesigns.length} of {designs.length} design{designs.length !== 1 ? 's' : ''}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800/50 border border-gray-700 rounded-lg p-0.5 sm:p-1">
          <button
            onClick={toggleViewMode}
            className={`p-1.5 sm:p-2 rounded transition-all ${
              viewMode === 'grid' ? 'bg-[#e21c21] text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Grid view"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={toggleViewMode}
            className={`p-1.5 sm:p-2 rounded transition-all ${
              viewMode === 'list' ? 'bg-[#e21c21] text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="List view"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Designs Display */}
      {filteredDesigns.length === 0 ? (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-6 sm:p-8 md:p-12 text-center overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="max-w-md mx-auto relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#e21c21]/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-[#e21c21]/30">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No designs found</h3>
            <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
              {hasActiveFilters ? 'Try adjusting your filters or search query' : 'Get started by creating your first design'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Clear All Filters</span>
              </button>
            ) : (
              <Link
                href="/admin/designs/new"
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative">Create your first design</span>
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
          {filteredDesigns.map((design) => {
            const isSelected = selectedDesigns.has(design.id);
            return (
              <div
                key={design.id}
                className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden transition-all hover:shadow-2xl cursor-pointer group/card ${
                  isSelected
                    ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50'
                    : 'border-gray-700 hover:border-[#e21c21]/50'
                }`}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                onClick={() => setPreviewDesign(design)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                {/* Design Image */}
                <div className="relative aspect-square bg-gray-900 overflow-hidden">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                    <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDesignSelection(design.id)}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-600 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0 bg-gray-700 cursor-pointer shadow-lg"
                      />
                    </label>
                  </div>
                  {design.primary_mockup_url ? (
                    <img
                      src={design.primary_mockup_url}
                      alt={design.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full backdrop-blur-sm ${
                        design.active
                          ? 'bg-green-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                      }`}
                    >
                      {design.active ? 'Active' : 'Inactive'}
                    </span>
                    {design.featured && (
                      <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full backdrop-blur-sm bg-yellow-500/90 text-white">
                        ★ Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Design Info */}
                <div className="p-3 sm:p-4 md:p-5">
                  <div className="mb-2 sm:mb-3">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg text-white mb-1 line-clamp-1">{design.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">/{design.slug}</p>
                  </div>

                  {/* Sport Icons */}
                  {design.available_sports && design.available_sports.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-2 sm:mb-3">
                      {design.available_sports.map((sport) => (
                        <span key={sport} className="text-base sm:text-lg" title={sport}>
                          {getSportIcon(sport)}
                        </span>
                      ))}
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-400">{design.mockup_count || 0} mockups</span>
                    </div>
                  )}

                  {/* Color Scheme */}
                  {design.color_scheme && design.color_scheme.length > 0 && (
                    <div className="flex items-center gap-1 mb-2 sm:mb-3">
                      {design.color_scheme.slice(0, 5).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border border-gray-600"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-700 relative">
                    <Link
                      href={`/admin/designs/${design.id}/edit`}
                      className="relative flex-1 p-1.5 sm:p-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg transition-all text-center text-xs sm:text-sm font-semibold shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
                      onClick={(e) => e.stopPropagation()}
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">Edit</span>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDesign(design);
                      }}
                      className="relative p-1.5 sm:p-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all overflow-hidden group/btn"
                      title="Delete"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2 sm:space-y-3">
          {filteredDesigns.map((design) => {
            const isSelected = selectedDesigns.has(design.id);
            return (
              <div
                key={design.id}
                className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden transition-all hover:shadow-2xl cursor-pointer flex group/card ${
                  isSelected
                    ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50'
                    : 'border-gray-700 hover:border-[#e21c21]/50'
                }`}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                onClick={() => setPreviewDesign(design)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                {/* Checkbox */}
                <div className="flex items-center p-2 sm:p-3 md:p-4 relative">
                  <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDesignSelection(design.id)}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-600 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0 bg-gray-700 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Image */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-900 flex-shrink-0">
                  {design.primary_mockup_url ? (
                    <img src={design.primary_mockup_url} alt={design.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex-1 w-full sm:w-auto">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg text-white mb-1">{design.name}</h3>
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-400 flex-wrap">
                      <span>/{design.slug}</span>
                      {design.available_sports && design.available_sports.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {design.available_sports.map((sport) => (
                              <span key={sport} title={sport}>
                                {getSportIcon(sport)}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      <span>•</span>
                      <span>{design.mockup_count || 0} mockups</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
                    {/* Status & Featured Badges */}
                    <div className="flex flex-row sm:flex-col gap-2 flex-wrap">
                      <span
                        className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${
                          design.active
                            ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                            : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                        }`}
                      >
                        {design.active ? 'Active' : 'Inactive'}
                      </span>
                      {design.featured && (
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                          ★ Featured
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 relative">
                      <Link
                        href={`/admin/designs/${design.id}/edit`}
                        className="relative p-1.5 sm:p-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
                        title="Edit"
                        onClick={(e) => e.stopPropagation()}
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDesign(design);
                        }}
                        className="relative p-1.5 sm:p-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all overflow-hidden group/btn"
                        title="Delete"
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDesign && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDesign(null)}
        >
          <div
            className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white">{previewDesign.name}</h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      previewDesign.active
                        ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                    }`}
                  >
                    {previewDesign.active ? 'Active' : 'Inactive'}
                  </span>
                  {previewDesign.featured && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                      ★ Featured
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewDesign(null)}
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
                  {previewDesign.primary_mockup_url ? (
                    <img
                      src={previewDesign.primary_mockup_url}
                      alt={previewDesign.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Slug</label>
                    <div className="text-gray-300 font-mono text-sm bg-gray-800 px-3 py-2 rounded border border-gray-700">
                      /{previewDesign.slug}
                    </div>
                  </div>

                  {previewDesign.description && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Description</label>
                      <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                        {previewDesign.description}
                      </div>
                    </div>
                  )}

                  {previewDesign.designer_name && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Designer</label>
                      <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                        {previewDesign.designer_name}
                      </div>
                    </div>
                  )}

                  {previewDesign.available_sports && previewDesign.available_sports.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Available Sports</label>
                      <div className="flex items-center gap-2">
                        {previewDesign.available_sports.map((sport) => (
                          <span
                            key={sport}
                            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          >
                            {getSportIcon(sport)} {sport}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewDesign.style_tags && previewDesign.style_tags.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Style Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {previewDesign.style_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-[#e21c21]/20 border border-[#e21c21]/50 rounded-full text-[#e21c21] text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewDesign.color_scheme && previewDesign.color_scheme.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Color Scheme</label>
                      <div className="flex items-center gap-2">
                        {previewDesign.color_scheme.map((color, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <div
                              className="w-10 h-10 rounded-full border-2 border-gray-600"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-gray-400">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Mockups</label>
                    <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                      {previewDesign.mockup_count || 0} mockup{previewDesign.mockup_count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-700 relative">
                    <Link
                      href={`/admin/designs/${previewDesign.id}/edit`}
                      className="relative flex-1 px-4 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                      <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="relative">Edit</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleDeleteDesign(previewDesign);
                        setPreviewDesign(null);
                      }}
                      className="relative px-4 py-3 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all font-semibold flex items-center justify-center gap-2 overflow-hidden group/btn"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                      <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="relative">Delete</span>
                    </button>
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
