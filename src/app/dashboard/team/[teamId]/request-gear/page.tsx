import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { RequestGearClient } from './RequestGearClient';

interface Product {
  id: string;
  name: string;
  thumbnail_url: string | null;
  thumbnail_alt: string;
}

export default async function RequestGearPage({
  params,
  searchParams
}: {
  params: { teamId: string };
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/team');

  // Fetch team details
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, created_at, created_by')
    .eq('id', params.teamId)
    .single();

  if (error || !team) {
    notFound();
  }

  // Check if user is the owner
  const isOwner = team.created_by === user.id;

  // Extract selected product IDs from search params
  const selectedProducts: Record<string, Product> = {};
  const productIds = Object.values(searchParams).filter(Boolean) as string[];

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select(`
        id,
        name,
        product_images(url, alt_text, sort_order)
      `)
      .in('id', productIds);

    if (products) {
      products.forEach((product: any) => {
        const thumbnailImage = product.product_images
          ?.sort((a: any, b: any) => a.sort_order - b.sort_order)?.[0];

        const productData = {
          id: product.id,
          name: product.name,
          thumbnail_url: thumbnailImage?.url || null,
          thumbnail_alt: thumbnailImage?.alt_text || product.name,
        };

        // Find which apparel type this product was selected for
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value === product.id) {
            selectedProducts[key] = productData;
          }
        });
      });
    }
  }

  return (
    <RequestGearClient
      teamId={params.teamId}
      teamName={team.name}
      isOwner={isOwner}
      initialSelections={selectedProducts}
    />
  );
}
