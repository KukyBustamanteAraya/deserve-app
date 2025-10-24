'use client';

import { memo } from 'react';
import type { DesignImage, Product, Sport } from './types';
import { VIEW_ANGLE_OPTIONS } from './constants';

interface ImageUploadCardProps {
  image: DesignImage;
  index: number;
  sports: Sport[];
  products: Product[];
  errors: Record<string, string>;
  onUpdate: (index: number, field: keyof DesignImage, value: any) => void;
  onRemove: (index: number) => void;
  onFileChange: (index: number, file: File) => void;
  getProductsForSport: (sportId: string) => Product[];
}

const ImageUploadCard = memo(function ImageUploadCard({
  image,
  index,
  sports,
  products,
  errors,
  onUpdate,
  onRemove,
  onFileChange,
  getProductsForSport,
}: ImageUploadCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="flex-shrink-0">
          {image.mockup_url ? (
            <img
              src={image.mockup_url}
              alt="Design image preview"
              className="w-24 h-24 object-cover rounded border border-gray-700"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-600"
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
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sport */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sport <span className="text-[#e21c21]">*</span>
            </label>
            <select
              value={image.sport_id}
              onChange={(e) => onUpdate(index, 'sport_id', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border ${
                errors[`image_${index}_sport`] ? 'border-[#e21c21]' : 'border-gray-700'
              } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
              data-error={!!errors[`image_${index}_sport`]}
            >
              <option value="">Select sport</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
            {errors[`image_${index}_sport`] && (
              <p className="text-red-400 text-sm mt-1">{errors[`image_${index}_sport`]}</p>
            )}
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Product <span className="text-[#e21c21]">*</span>
            </label>
            <select
              value={image.product_id || ''}
              onChange={(e) => onUpdate(index, 'product_id', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border ${
                errors[`image_${index}_product`] ? 'border-[#e21c21]' : 'border-gray-700'
              } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
              data-error={!!errors[`image_${index}_product`]}
            >
              <option value="">Select product</option>
              {getProductsForSport(image.sport_id).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (${product.price_clp.toLocaleString()} CLP)
                </option>
              ))}
            </select>
            {errors[`image_${index}_product`] && (
              <p className="text-red-400 text-sm mt-1">{errors[`image_${index}_product`]}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {getProductsForSport(image.sport_id).length === 0
                ? 'No products available for this sport. Please create products first.'
                : 'Select the specific product this design image applies to'}
            </p>
          </div>

          {/* View Angle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">View Angle</label>
            <select
              value={image.view_angle}
              onChange={(e) => onUpdate(index, 'view_angle', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
            >
              {VIEW_ANGLE_OPTIONS.map((angle) => (
                <option key={angle} value={angle}>
                  {angle}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Image <span className="text-[#e21c21]">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileChange(index, file);
              }}
              className={`w-full px-3 py-2 bg-gray-800 border ${
                errors[`image_${index}_url`] ? 'border-[#e21c21]' : 'border-gray-700'
              } rounded-md text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#e21c21] file:text-white hover:file:bg-pink-700 cursor-pointer`}
              data-error={!!errors[`image_${index}_url`]}
            />
            {errors[`image_${index}_url`] && (
              <p className="text-red-400 text-sm mt-1">{errors[`image_${index}_url`]}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={image.is_primary}
              onChange={(e) => onUpdate(index, 'is_primary', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-400">Primary</span>
          </label>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-pink-300 transition-colors text-sm"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
});

export default ImageUploadCard;
