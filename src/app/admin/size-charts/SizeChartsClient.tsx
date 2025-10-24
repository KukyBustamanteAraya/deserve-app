'use client';

import { useState } from 'react';
import type { SizeChartModel, Gender, SizeValue } from '@/types/sizing';

interface Sport {
  id: number;
  name: string;
  slug: string;
}

interface SizeChartsClientProps {
  initialSizeCharts: any[];
  sports: Sport[];
}

export function SizeChartsClient({ initialSizeCharts, sports }: SizeChartsClientProps) {
  const [sizeCharts, setSizeCharts] = useState(initialSizeCharts);
  const [filterSport, setFilterSport] = useState<number | 'all'>('all');
  const [filterGender, setFilterGender] = useState<Gender | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter size charts
  const filteredCharts = sizeCharts.filter((chart) => {
    if (filterSport !== 'all' && chart.sport_id !== filterSport) return false;
    if (filterGender !== 'all' && chart.gender !== filterGender) return false;
    return true;
  });

  // Group by sport and product type
  const groupedCharts = filteredCharts.reduce((acc, chart) => {
    const key = `${chart.sport_id}-${chart.product_type_slug}-${chart.gender}`;
    if (!acc[key]) {
      acc[key] = {
        sportId: chart.sport_id,
        sportName: chart.sports?.name || 'Unknown',
        productType: chart.product_type_slug,
        gender: chart.gender,
        sizes: [],
      };
    }
    acc[key].sizes.push(chart);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      {/* Filters and Add Button */}
      <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 flex-wrap flex-1">
            {/* Sport Filter */}
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]"
            >
              <option value="all">All Sports</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>

            {/* Gender Filter */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as Gender | 'all')}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]"
            >
              <option value="all">All Genders</option>
              <option value="boys">Boys</option>
              <option value="girls">Girls</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-gradient-to-r from-[#e21c21] to-[#c11a1e] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#e21c21]/50 transition-all"
          >
            + Add Size Chart
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          Showing {Object.keys(groupedCharts).length} size chart groups ({filteredCharts.length} total sizes)
        </div>
      </div>

      {/* Size Chart Groups */}
      {Object.keys(groupedCharts).length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No size charts found. Add your first size chart to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedCharts).map((group: any) => (
            <div
              key={`${group.sportId}-${group.productType}-${group.gender}`}
              className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Group Header */}
              <div className="bg-gradient-to-r from-[#e21c21]/20 to-[#c11a1e]/20 px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">
                  {group.sportName} - {group.productType}
                </h3>
                <p className="text-sm text-gray-400 capitalize">
                  {group.gender}
                </p>
              </div>

              {/* Sizes Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Height Range</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Chest</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Length</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {group.sizes.map((size: any) => (
                      <tr key={size.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-white font-bold text-lg">{size.size}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {size.height_min_cm}-{size.height_max_cm} cm
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {size.chest_width_cm} cm
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {size.jersey_length_cm} cm
                        </td>
                        <td className="px-4 py-3">
                          {size.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/20 text-green-400 border border-green-500/50">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-[#e21c21] hover:text-[#ff6b6b] text-sm font-medium">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
