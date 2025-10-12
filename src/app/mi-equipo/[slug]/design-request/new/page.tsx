'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';
import { logger } from '@/lib/logger';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  description: string | null;
  product_type_slug: string;
}

interface Team {
  id: string;
  slug: string;
  name: string;
  sport_id: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url: string | null;
}

export default function ProductSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const {
    setTeamContext,
    setProduct,
    teamColors,
    selectedProductId,
  } = useTeamDesignRequest();

  const [team, setTeam] = useState<Team | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamAndProducts();
  }, [params.slug]);

  const loadTeamAndProducts = async () => {
    try {
      // Get team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, slug, name, sport_id, colors, logo_url')
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;
      if (!teamData) throw new Error('Team not found');

      setTeam(teamData);

      // Set team context in wizard state
      const colors = teamData.colors || { primary: '#3B82F6', secondary: '#1E40AF', accent: '#FFFFFF' };
      setTeamContext(
        teamData.id,
        teamData.slug,
        {
          primary: colors.primary,
          secondary: colors.secondary,
          tertiary: colors.accent,
        },
        teamData.logo_url
      );

      // Fetch products for this sport
      if (teamData.sport_id) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, slug, category, price_cents, description, product_type_slug')
          .contains('sport_ids', [teamData.sport_id])
          .eq('status', 'active')
          .order('sort_order', { ascending: true });

        if (productsError) {
          logger.error('Error fetching products:', productsError);
          throw productsError;
        }

        setProducts(productsData || []);
      } else {
        logger.warn('Team has no sport_id, showing all products');
        // Fallback: show all active products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, slug, category, price_cents, description, product_type_slug')
          .eq('status', 'active')
          .order('sort_order', { ascending: true });

        if (productsError) throw productsError;
        setProducts(productsData || []);
      }
    } catch (err: any) {
      logger.error('Error loading team and products:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setProduct(product.id, product.name, product.slug);
    // Navigate to design selection step
    router.push(`/mi-equipo/${params.slug}/design-request/designs`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver al equipo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="mb-4 text-white/90 hover:text-white font-medium flex items-center gap-2"
          >
            ← Volver al equipo
          </button>

          <div>
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/90 mb-3">
              🎨 Nueva Solicitud de Diseño
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Paso 1: Selecciona el Producto</h1>
            <p className="text-white/80 text-lg">{team.name}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span className="font-semibold text-blue-600">Producto</span>
            <span>Diseño</span>
            <span>Colores</span>
            <span>Detalles</span>
            <span>Logo</span>
            <span>Nombres</span>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <span className="text-6xl mb-4 block">📦</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay productos disponibles</h2>
            <p className="text-gray-600 mb-6">
              No se encontraron productos para el deporte de tu equipo
            </p>
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ← Volver al equipo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`bg-white rounded-lg shadow-sm p-6 text-left transition-all hover:shadow-lg hover:scale-105 border-2 ${
                  selectedProductId === product.id
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">
                    {product.category === 'camiseta' && '👕'}
                    {product.category === 'short' && '🩳'}
                    {product.category === 'medias' && '🧦'}
                    {product.category === 'chaqueta' && '🧥'}
                    {product.category === 'pantalon' && '👖'}
                    {product.category === 'bolso' && '🎒'}
                  </div>
                  {selectedProductId === product.id && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500 capitalize font-medium">{product.category}</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${product.price_cents.toLocaleString()} CLP
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Custom Design Option */}
        {products.length > 0 && (
          <div className="mt-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-300">
              <div className="flex items-start gap-4">
                <span className="text-4xl">✨</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¿Tienes un diseño personalizado?</h3>
                  <p className="text-gray-700 mb-4">
                    Si tienes un diseño específico en mente o una referencia, puedes solicitar un diseño completamente personalizado.
                  </p>
                  <button
                    onClick={() => {
                      // TODO: Open custom design modal or navigate to custom design page
                      alert('Funcionalidad de diseño personalizado próximamente. Por ahora, selecciona un producto y personaliza los colores en el siguiente paso.');
                    }}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Solicitar Diseño Personalizado
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
