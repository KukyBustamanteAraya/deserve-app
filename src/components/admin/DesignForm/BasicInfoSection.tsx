'use client';

import { memo } from 'react';
import type { Design } from './types';

interface BasicInfoSectionProps {
  formData: Design;
  errors: Record<string, string>;
  onUpdate: (field: keyof Design, value: any) => void;
}

const BasicInfoSection = memo(function BasicInfoSection({
  formData,
  errors,
  onUpdate,
}: BasicInfoSectionProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
            Name <span className="text-[#e21c21]">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-900 border ${
              errors.name ? 'border-[#e21c21]' : 'border-gray-700'
            } rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
            placeholder="Thunder Strike"
            data-error={!!errors.name}
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">
            Slug <span className="text-[#e21c21]">*</span>
          </label>
          <input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) => onUpdate('slug', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-900 border ${
              errors.slug ? 'border-[#e21c21]' : 'border-gray-700'
            } rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
            placeholder="thunder-strike"
            data-error={!!errors.slug}
          />
          {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug}</p>}
          <p className="text-gray-500 text-xs mt-1">
            URL-friendly identifier (lowercase, hyphens only)
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
            placeholder="A bold, modern design featuring striking geometric patterns..."
          />
        </div>

        {/* Designer Name */}
        <div>
          <label htmlFor="designer_name" className="block text-sm font-medium text-gray-300 mb-1">
            Designer Name
          </label>
          <input
            type="text"
            id="designer_name"
            value={formData.designer_name}
            onChange={(e) => onUpdate('designer_name', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
            placeholder="Studio Deserve"
          />
        </div>
      </div>
    </div>
  );
});

export default BasicInfoSection;
