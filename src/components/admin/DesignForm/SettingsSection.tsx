'use client';

import { memo } from 'react';
import type { Design } from './types';

interface SettingsSectionProps {
  formData: Design;
  onUpdate: (field: keyof Design, value: any) => void;
}

const SettingsSection = memo(function SettingsSection({ formData, onUpdate }: SettingsSectionProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4 relative">Settings</h2>
      <div className="space-y-3">
        {/* Is Customizable */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_customizable}
            onChange={(e) => onUpdate('is_customizable', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
          />
          <div>
            <div className="text-white font-medium">Is Customizable</div>
            <div className="text-gray-400 text-sm">
              Allow customers to customize this design with names, numbers, etc.
            </div>
          </div>
        </label>

        {/* Allows Recoloring */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allows_recoloring}
            onChange={(e) => onUpdate('allows_recoloring', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
          />
          <div>
            <div className="text-white font-medium">Allows Recoloring</div>
            <div className="text-gray-400 text-sm">
              Allow customers to change the colors of this design
            </div>
          </div>
        </label>

        {/* Featured */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => onUpdate('featured', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
          />
          <div>
            <div className="text-white font-medium">Featured</div>
            <div className="text-gray-400 text-sm">Show this design in featured sections</div>
          </div>
        </label>

        {/* Active */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={(e) => onUpdate('active', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
          />
          <div>
            <div className="text-white font-medium">Active</div>
            <div className="text-gray-400 text-sm">
              Make this design visible to customers in the catalog
            </div>
          </div>
        </label>
      </div>
    </div>
  );
});

export default SettingsSection;
