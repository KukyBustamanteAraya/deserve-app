'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import BulkUploadModal from '@/components/admin/BulkUploadModal';
import {
  type Design,
  useDesignsGrid,
  BulkActionsBar,
  SearchAndFilters,
  ProductCategoryToggles,
  ViewModeToggle,
  EmptyState,
  DesignCardGrid,
  DesignCardList,
  DesignPreviewModal,
} from './components';

interface DesignsGridProps {
  designs: Design[];
}

const DesignsGrid = memo(function DesignsGrid({ designs }: DesignsGridProps) {
  const router = useRouter();
  const {
    // State
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
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
    handleBulkDelete,
    handleBulkSetActive,
    handleBulkSetInactive,
    handleDeleteDesign,
  } = useDesignsGrid(designs);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <BulkActionsBar
          selectedCount={selectedDesigns.size}
          isLoading={isLoading}
          onClearSelection={clearSelection}
          onSetActive={handleBulkSetActive}
          onSetInactive={handleBulkSetInactive}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Search and Filters */}
      <SearchAndFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        sportFilter={sportFilter}
        sortBy={sortBy}
        uniqueSports={uniqueSports}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onSportChange={setSportFilter}
        onSortChange={setSortBy}
        onClearFilters={clearFilters}
      />

      {/* Product Category Toggles */}
      <ProductCategoryToggles
        productTypeFilter={productTypeFilter}
        uniqueProductTypes={uniqueProductTypes}
        onProductTypeChange={setProductTypeFilter}
        onBulkUpload={() => setShowBulkUpload(true)}
      />

      {/* Results count and View Toggle */}
      <ViewModeToggle
        viewMode={viewMode}
        onToggle={toggleViewMode}
        totalDesigns={designs.length}
        filteredCount={filteredDesigns.length}
      />

      {/* Designs Display */}
      {filteredDesigns.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
          {filteredDesigns.map((design) => (
            <DesignCardGrid
              key={design.id}
              design={design}
              isSelected={selectedDesigns.has(design.id)}
              onToggleSelection={toggleDesignSelection}
              onPreview={setPreviewDesign}
              onDelete={handleDeleteDesign}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2 sm:space-y-3">
          {filteredDesigns.map((design) => (
            <DesignCardList
              key={design.id}
              design={design}
              isSelected={selectedDesigns.has(design.id)}
              onToggleSelection={toggleDesignSelection}
              onPreview={setPreviewDesign}
              onDelete={handleDeleteDesign}
            />
          ))}
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUploadModal
          designs={designs}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            router.refresh();
          }}
        />
      )}

      {/* Preview Modal */}
      {previewDesign && (
        <DesignPreviewModal
          design={previewDesign}
          onClose={() => setPreviewDesign(null)}
          onDelete={handleDeleteDesign}
        />
      )}
    </div>
  );
});

export default DesignsGrid;
