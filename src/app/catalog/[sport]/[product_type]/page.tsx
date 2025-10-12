// Design Browser - Shows all designs for a sport+product combination
// Example: /catalog/futbol/jersey
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { DesignBrowserClient } from './DesignBrowserClient';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    sport: string;
    product_type: string;
  };
  searchParams: {
    style?: string;
    featured?: string;
    sort?: string;
  };
}

async function getCatalogData(sportSlug: string, productTypeSlug: string, searchParams: any) {
  try {
    // Build query params
    const params = new URLSearchParams();
    if (searchParams.style) params.append('style', searchParams.style);
    if (searchParams.featured) params.append('featured', searchParams.featured);
    if (searchParams.sort) params.append('sort', searchParams.sort);

    const queryString = params.toString();
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/catalog/${sportSlug}/${productTypeSlug}/designs${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      logger.error(`Design browser API error: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      logger.error('Design browser API returned error:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    logger.error('Error fetching design browser data:', error);
    return null;
  }
}

async function getProductInfo(sportSlug: string, productTypeSlug: string) {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/catalog/${sportSlug}/products`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) return null;

    const result = await response.json();
    if (!result.success) return null;

    // Find the specific product
    const product = result.data.products.find(
      (p: any) => p.product_type_slug === productTypeSlug
    );

    return product || null;
  } catch (error) {
    logger.error('Error fetching product info:', error);
    return null;
  }
}

export default async function DesignBrowserPage({ params, searchParams }: PageProps) {
  const { sport, product_type } = params;

  // Check authentication
  const supabase = createSupabaseServer();
  try {
    await requireAuth(supabase);
  } catch (error) {
    redirect(`/login?redirect=/catalog/${sport}/${product_type}`);
  }

  // Fetch design data and product info
  const [catalogData, productInfo] = await Promise.all([
    getCatalogData(sport, product_type, searchParams),
    getProductInfo(sport, product_type),
  ]);

  if (!catalogData) {
    notFound();
  }

  const { sport: sportData, product_type: productType, designs, total_designs, filters_applied } = catalogData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/catalog" className="text-blue-400 hover:text-blue-300 transition-colors">
            Catálogo
          </Link>
          <span className="text-gray-500">/</span>
          <Link href={`/catalog/${sport}`} className="text-blue-400 hover:text-blue-300 transition-colors">
            {sportData.name}
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-white">{productInfo?.product_type_name || productType}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {productInfo?.product_type_name || productType} - {sportData.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-400">
            <span>{total_designs} {total_designs === 1 ? 'diseño' : 'diseños'}</span>
            {productInfo && (
              <>
                <span>•</span>
                <span className="text-blue-400 font-semibold">
                  ${productInfo.price_cents.toLocaleString()} CLP
                </span>
              </>
            )}
          </div>
        </div>

        {/* Client component with filters and design grid */}
        <DesignBrowserClient
          designs={designs}
          sportSlug={sport}
          productTypeSlug={product_type}
          initialFilters={filters_applied}
        />
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const catalogData = await getCatalogData(params.sport, params.product_type, {});
  const productInfo = await getProductInfo(params.sport, params.product_type);

  if (!catalogData) {
    return {
      title: 'Diseños | Deserve',
      description: 'Explora nuestros diseños',
    };
  }

  const productName = productInfo?.product_type_name || params.product_type;

  return {
    title: `${productName} - ${catalogData.sport.name} | Deserve`,
    description: `Explora ${catalogData.total_designs} diseños de ${productName} para ${catalogData.sport.name}`,
  };
}
