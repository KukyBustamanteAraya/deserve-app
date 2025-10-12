'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Design {
  design_id: string;
  slug: string;
  name: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  primary_mockup_url: string;
  available_on_sports: any[];
  created_at: string;
}

interface DesignBrowserClientProps {
  designs: Design[];
  sportSlug: string;
  productTypeSlug: string;
  initialFilters: {
    style: string | null;
    featured: boolean;
    sort: string;
  };
}

export function DesignBrowserClient({
  designs,
  sportSlug,
  productTypeSlug,
  initialFilters,
}: DesignBrowserClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Get all unique style tags from designs
  const allStyleTags = Array.from(
    new Set(designs.flatMap((d) => d.style_tags))
  ).sort();

  const handleFilterChange = (key: string, value: string | boolean) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === '' || value === false) {
      params.delete(key);
    } else {
      params.set(key, value.toString());
    }

    router.push(`/catalog/${sportSlug}/${productTypeSlug}?${params.toString()}`);
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-8 bg-gray-800/50 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filtros</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {showFilters ? 'Ocultar' : 'Mostrar'} filtros
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ordenar por
              </label>
              <select
                value={initialFilters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Más recientes</option>
                <option value="name">Nombre (A-Z)</option>
                <option value="popular">Más populares</option>
              </select>
            </div>

            {/* Featured Only */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                checked={initialFilters.featured}
                onChange={(e) => handleFilterChange('featured', e.target.checked)}
                className="w-5 h-5 rounded bg-gray-900 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="featured" className="text-sm text-gray-300">
                Solo diseños destacados
              </label>
            </div>

            {/* Style Tags */}
            {allStyleTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Estilo
                </label>
                <select
                  value={initialFilters.style || ''}
                  onChange={(e) => handleFilterChange('style', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los estilos</option>
                  {allStyleTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Design Grid */}
      {designs.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">
            No hay diseños disponibles
          </h3>
          <p className="text-gray-400 mb-4">
            No se encontraron diseños que coincidan con tus filtros.
          </p>
          <button
            onClick={() => router.push(`/catalog/${sportSlug}/${productTypeSlug}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {designs.map((design) => (
            <Link
              key={design.design_id}
              href={`/designs/${design.slug}?sport=${sportSlug}`}
              className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-500/20"
            >
              {/* Design Image */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                {design.primary_mockup_url ? (
                  <img
                    src={design.primary_mockup_url}
                    alt={design.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500">
                    <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Featured Badge */}
                {design.featured && (
                  <div className="absolute top-3 left-3 bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    Destacado
                  </div>
                )}

                {/* Available Sports Badge */}
                {design.available_on_sports.length > 1 && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    {design.available_on_sports.length} deportes
                  </div>
                )}
              </div>

              {/* Design Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {design.name}
                </h3>

                {design.designer_name && (
                  <p className="text-sm text-gray-400 mb-3">
                    por {design.designer_name}
                  </p>
                )}

                {design.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {design.description}
                  </p>
                )}

                {/* Style Tags */}
                {design.style_tags && design.style_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {design.style_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50"
                      >
                        {tag}
                      </span>
                    ))}
                    {design.style_tags.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{design.style_tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Features */}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  {design.is_customizable && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Personalizable
                    </span>
                  )}
                  {design.allows_recoloring && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Recoloreable
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
