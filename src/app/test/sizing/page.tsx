// Test page for sizing calculator - Concise single-card version
import { createSupabaseServer } from '@/lib/supabase/server-client';
import SizingTestClient from './SizingTestClient';

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

export default async function SizingTestPage() {
  const sports = await getSports();

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Sizing Calculator</h1>
          <p className="text-gray-400">
            Find your perfect fit with real Deserve Athletics sizing
          </p>
        </div>

        <SizingTestClient sports={sports} />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sizing Calculator | Deserve Athletics',
  description: 'Find your perfect fit',
};
