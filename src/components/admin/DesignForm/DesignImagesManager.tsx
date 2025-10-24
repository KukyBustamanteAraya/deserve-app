'use client';

import { memo } from 'react';
import type { DesignImage, Product, Sport } from './types';
import ImageUploadCard from './ImageUploadCard';

interface DesignImagesManagerProps {
  designImages: DesignImage[];
  sports: Sport[];
  products: Product[];
  errors: Record<string, string>;
  onAddImage: () => void;
  onUpdateImage: (index: number, field: keyof DesignImage, value: any) => void;
  onRemoveImage: (index: number) => void;
  onFileChange: (index: number, file: File) => void;
  getProductsForSport: (sportId: string) => Product[];
}

const DesignImagesManager = memo(function DesignImagesManager({
  designImages,
  sports,
  products,
  errors,
  onAddImage,
  onUpdateImage,
  onRemoveImage,
  onFileChange,
  getProductsForSport,
}: DesignImagesManagerProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <h2 className="text-xl font-semibold text-white">Design Images</h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload design images for different sports and products
          </p>
        </div>
        <button
          type="button"
          onClick={onAddImage}
          className="relative px-4 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn flex items-center gap-2"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
          <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="relative">Add Design Image</span>
        </button>
      </div>

      {designImages.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-400 mb-4">No design images added yet</p>
          <button
            type="button"
            onClick={onAddImage}
            className="px-6 py-2 bg-[#e21c21] text-white rounded-md hover:bg-[#c11a1e] transition-colors"
          >
            Add Your First Design Image
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {designImages.map((image, index) => (
            <ImageUploadCard
              key={image.id || index}
              image={image}
              index={index}
              sports={sports}
              products={products}
              errors={errors}
              onUpdate={onUpdateImage}
              onRemove={onRemoveImage}
              onFileChange={onFileChange}
              getProductsForSport={getProductsForSport}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default DesignImagesManager;
