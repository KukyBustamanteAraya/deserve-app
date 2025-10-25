import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-utils';

export async function GET() {
  try {
    // Generate manifest with dynamic icon paths
    const manifest = {
      name: 'Deserve - Equipamiento Deportivo Personalizado',
      short_name: 'Deserve',
      description: 'Plataforma de equipamiento deportivo personalizado para equipos e instituciones en Chile',
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone' as const,
      scope: '/',
      start_url: '/',
      orientation: 'portrait' as const,
      icons: [
        {
          src: '/api/pwa-icons/192',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/api/pwa-icons/256',
          sizes: '256x256',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/api/pwa-icons/384',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/api/pwa-icons/512',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['sports', 'shopping', 'business'],
      shortcuts: [
        {
          name: 'Catálogo',
          short_name: 'Catálogo',
          description: 'Ver productos disponibles',
          url: '/catalog',
          icons: [{ src: '/api/pwa-icons/192', sizes: '192x192' }],
        },
        {
          name: 'Mis Equipos',
          short_name: 'Equipos',
          description: 'Administrar mis equipos',
          url: '/mi-equipo',
          icons: [{ src: '/api/pwa-icons/192', sizes: '192x192' }],
        },
        {
          name: 'Diseños',
          short_name: 'Diseños',
          description: 'Explorar diseños',
          url: '/designs',
          icons: [{ src: '/api/pwa-icons/192', sizes: '192x192' }],
        },
      ],
    };

    logger.debug('Generated dynamic PWA manifest');

    // Return manifest with proper caching headers
    const response = NextResponse.json(manifest, { status: 200 });
    response.headers.set('Content-Type', 'application/manifest+json');
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    return response;
  } catch (error) {
    logger.error('Error generating manifest:', toError(error));
    return NextResponse.json(
      { error: 'Failed to generate manifest' },
      { status: 500 }
    );
  }
}
