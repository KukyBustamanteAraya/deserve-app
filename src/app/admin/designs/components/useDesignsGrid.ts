'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Design } from './types';

export const useDesignsGrid = (designs: Design[]) => {
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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
          return 0;
      }
    });

    return filtered;
  }, [designs, searchQuery, statusFilter, featuredFilter, sportFilter, sortBy, productTypeFilter]);

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('admin-designs-view') as 'grid' | 'list' | null;
    if (savedView) {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference
  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    localStorage.setItem('admin-designs-view', newMode);
  }, [viewMode]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setFeaturedFilter('all');
    setSportFilter('all');
    setProductTypeFilter('all');
    setSortBy('newest');
  }, []);

  const hasActiveFilters = !!(
    searchQuery || statusFilter !== 'all' || featuredFilter !== 'all' || sportFilter !== 'all' || productTypeFilter !== 'all' || sortBy !== 'newest'
  );

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
  }, [searchQuery, hasActiveFilters, selectedDesigns, previewDesign, clearFilters]);

  // Bulk selection handlers
  const toggleDesignSelection = useCallback((designId: string) => {
    const newSelection = new Set(selectedDesigns);
    if (newSelection.has(designId)) {
      newSelection.delete(designId);
    } else {
      newSelection.add(designId);
    }
    setSelectedDesigns(newSelection);
    setShowBulkActions(newSelection.size > 0);
  }, [selectedDesigns]);

  const toggleSelectAll = useCallback(() => {
    if (selectedDesigns.size === filteredDesigns.length) {
      setSelectedDesigns(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredDesigns.map((d) => d.id));
      setSelectedDesigns(allIds);
      setShowBulkActions(true);
    }
  }, [selectedDesigns, filteredDesigns]);

  const handleBulkDelete = useCallback(async () => {
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
  }, [selectedDesigns]);

  const handleBulkSetActive = useCallback(async () => {
    if (!confirm(`Set ${selectedDesigns.size} design(s) as active?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const designIds = Array.from(selectedDesigns);

      const updatePromises = designIds.map(async (id) => {
        const response = await fetch(`/api/admin/designs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update design ${id}`);
        }

        return response.json();
      });

      await Promise.all(updatePromises);

      setSelectedDesigns(new Set());
      setShowBulkActions(false);
      router.refresh();

      alert(`Successfully set ${designIds.length} design(s) as active`);
    } catch (error) {
      alert('Error updating designs. Some updates may have failed.');
      logger.error('Bulk activation error:', { error });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDesigns, router]);

  const handleBulkSetInactive = useCallback(async () => {
    if (!confirm(`Set ${selectedDesigns.size} design(s) as inactive (draft)?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const designIds = Array.from(selectedDesigns);

      const updatePromises = designIds.map(async (id) => {
        const response = await fetch(`/api/admin/designs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update design ${id}`);
        }

        return response.json();
      });

      await Promise.all(updatePromises);

      setSelectedDesigns(new Set());
      setShowBulkActions(false);
      router.refresh();

      alert(`Successfully set ${designIds.length} design(s) as inactive`);
    } catch (error) {
      alert('Error updating designs. Some updates may have failed.');
      logger.error('Bulk deactivation error:', { error });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDesigns, router]);

  const handleDeleteDesign = useCallback(async (design: Design) => {
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

      router.refresh();
    } catch (error) {
      alert('Error deleting design');
      logger.error('Design deletion error:', { error });
    }
  }, [router]);

  const clearSelection = useCallback(() => {
    setSelectedDesigns(new Set());
    setShowBulkActions(false);
  }, []);

  return {
    // State
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    featuredFilter,
    setFeaturedFilter,
    sportFilter,
    setSportFilter,
    sortBy,
    setSortBy,
    productTypeFilter,
    setProductTypeFilter,
    selectedDesigns,
    showBulkActions,
    previewDesign,
    setPreviewDesign,
    viewMode,
    isLoading,
    showBulkUpload,
    setShowBulkUpload,

    // Computed
    uniqueSports,
    uniqueProductTypes,
    filteredDesigns,
    hasActiveFilters,

    // Actions
    toggleViewMode,
    clearFilters,
    clearSelection,
    toggleDesignSelection,
    toggleSelectAll,
    handleBulkDelete,
    handleBulkSetActive,
    handleBulkSetInactive,
    handleDeleteDesign,
  };
};
