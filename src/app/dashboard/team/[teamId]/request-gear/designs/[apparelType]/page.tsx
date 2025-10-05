import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { DesignSelectionClient } from './DesignSelectionClient';

const apparelTypeNames: Record<string, string> = {
  'camiseta': 'Camiseta',
  'set-visita': 'Set de Visita',
  'entrenamiento': 'Entrenamiento',
  'poleron': 'Poleron',
  'pantalon': 'Pantalon',
  'bolso': 'Bolso',
};

interface ProductWithImages {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  product_images: Array<{
    url: string;
    alt_text: string | null;
    sort_order: number;
  }>;
}

export default async function DesignSelectionPage({
  params
}: {
  params: { teamId: string; apparelType: string }
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/team');

  // Fetch team details
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, sport_id')
    .eq('id', params.teamId)
    .single();

  if (error || !team) {
    notFound();
  }

  // Fetch products for the team's sport
  const { data: rawProducts } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      price_cents,
      product_images(url, alt_text, sort_order)
    `)
    .eq('active', true)
    .eq('sport_id', team.sport_id)
    .order('created_at', { ascending: false })
    .limit(24);

  // Transform products to include thumbnail
  const products = (rawProducts || []).map((product: ProductWithImages) => {
    const thumbnailImage = product.product_images
      ?.sort((a, b) => a.sort_order - b.sort_order)?.[0];

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price_cents: product.price_cents,
      thumbnail_url: thumbnailImage?.url || null,
      thumbnail_alt: thumbnailImage?.alt_text || product.name,
    };
  });

  const apparelName = apparelTypeNames[params.apparelType] || params.apparelType;

  return (
    <DesignSelectionClient
      teamId={params.teamId}
      teamName={team.name}
      apparelType={params.apparelType}
      apparelName={apparelName}
      products={products}
    />
  );
}
