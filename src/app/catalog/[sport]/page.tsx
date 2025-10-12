// Product catalog page for a specific sport
// Example: /catalog/futbol shows all product types available for soccer
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    sport: string;
  };
}

async function getCatalogData(sportSlug: string) {
  try {
    // Use the catalog API to fetch products for this sport
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/catalog/${sportSlug}/products`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      logger.error(`Catalog API error: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      logger.error('Catalog API returned error:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    logger.error('Error fetching catalog data:', error);
    return null;
  }
}

export default async function SportCatalogPage({ params }: PageProps) {
  const { sport } = params;

  // Check authentication
  const supabase = createSupabaseServer();
  try {
    await requireAuth(supabase);
  } catch (error) {
    redirect(`/login?redirect=/catalog/${sport}`);
  }

  // Fetch catalog data
  const catalogData = await getCatalogData(sport);

  if (!catalogData) {
    notFound();
  }

  const { sport: sportData, products, total_products } = catalogData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/catalog"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al catálogo
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            {sportData.name}
          </h1>
          <p className="text-gray-400 text-lg">
            Explora {total_products} {total_products === 1 ? 'producto' : 'productos'} disponibles
          </p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">
                No hay productos disponibles
              </h3>
              <p className="text-gray-400">
                Los productos para {sportData.name} estarán disponibles pronto.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: any) => (
              <Link
                key={product.product_id}
                href={`/catalog/${sportData.slug}/${product.product_type_slug}`}
                className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-500/20"
              >
                {/* Product Image/Mockup */}
                <div className="relative h-64 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  {product.sample_design_mockup ? (
                    <img
                      src={product.sample_design_mockup}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-500">
                      <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}

                  {/* Design Count Badge */}
                  {product.available_designs_count > 0 && (
                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {product.available_designs_count} {product.available_designs_count === 1 ? 'diseño' : 'diseños'}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {product.product_type_name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 capitalize">
                    {product.category}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-400">
                      ${product.price_cents.toLocaleString()} CLP
                    </div>
                    {product.available_designs_count === 0 ? (
                      <span className="text-sm text-gray-500">
                        Sin diseños
                      </span>
                    ) : (
                      <div className="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                        <span className="text-sm font-medium">Ver diseños</span>
                        <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const catalogData = await getCatalogData(params.sport);

  if (!catalogData) {
    return {
      title: 'Catálogo | Deserve',
      description: 'Explora nuestro catálogo de uniformes deportivos',
    };
  }

  return {
    title: `${catalogData.sport.name} - Catálogo | Deserve`,
    description: `Explora ${catalogData.total_products} productos de ${catalogData.sport.name}`,
  };
}
