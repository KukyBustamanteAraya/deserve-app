// Admin page for managing size charts

import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { SizeChartsClient } from './SizeChartsClient';

async function getSizeCharts() {
  await requireAdmin();
  const supabase = await createSupabaseServer();

  const { data: sizeCharts, error } = await supabase
    .from('size_charts')
    .select(`
      *,
      sports (
        id,
        name,
        slug
      )
    `)
    .order('sport_id', { ascending: true })
    .order('product_type_slug', { ascending: true })
    .order('gender', { ascending: true })
    .order('size', { ascending: true });

  if (error) {
    console.error('Error fetching size charts:', error);
    return [];
  }

  return sizeCharts || [];
}

async function getSports() {
  const supabase = await createSupabaseServer();

  const { data: sports, error } = await supabase
    .from('sports')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching sports:', error);
    return [];
  }

  return sports || [];
}

export default async function SizeChartsPage() {
  const sizeCharts = await getSizeCharts();
  const sports = await getSports();

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Size Charts Management</h1>
        <p className="text-gray-400">
          Manage size charts for the sizing calculator
        </p>
      </div>

      <SizeChartsClient initialSizeCharts={sizeCharts} sports={sports} />
    </div>
  );
}

export const metadata = {
  title: 'Size Charts | Admin',
  description: 'Manage size charts for the sizing calculator',
};
