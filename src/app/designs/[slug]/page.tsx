// Design Detail Page - Shows design with sport switcher
// Example: /designs/elevate?sport=futbol
import { notFound } from 'next/navigation';
import { DesignDetailClient } from './DesignDetailClient';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    slug: string;
  };
  searchParams: {
    sport?: string;
  };
}

async function getDesignData(slug: string, sportSlug?: string) {
  try {
    const queryString = sportSlug ? `?sport=${sportSlug}` : '';
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/designs/${slug}${queryString}`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      logger.error(`Design detail API error: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      logger.error('Design detail API returned error:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    logger.error('Error fetching design data:', error);
    return null;
  }
}

export default async function DesignDetailPage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const { sport } = searchParams;

  // Fetch design data (no authentication required - catalog is public)
  const designData = await getDesignData(slug, sport);

  if (!designData) {
    notFound();
  }

  const {
    design,
    current_sport,
    available_sports,
    mockups_by_sport,
    current_mockups,
    total_sports,
  } = designData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        {/* Client component with sport switcher and design info */}
        <DesignDetailClient
          design={design}
          currentSport={current_sport}
          availableSports={available_sports}
          mockupsBySport={mockups_by_sport}
          currentMockups={current_mockups}
        />
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata({ params, searchParams }: PageProps) {
  const designData = await getDesignData(params.slug, searchParams.sport);

  if (!designData) {
    return {
      title: 'Diseño | Deserve',
      description: 'Explora nuestros diseños',
    };
  }

  const { design, current_sport } = designData;

  return {
    title: `${design.name}${current_sport ? ` - ${current_sport.name}` : ''} | Deserve`,
    description: design.description || `Diseño ${design.name} por ${design.designer_name || 'Deserve Studio'}`,
    openGraph: {
      title: design.name,
      description: design.description || `Diseño por ${design.designer_name || 'Deserve Studio'}`,
    },
  };
}
