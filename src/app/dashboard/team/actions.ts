'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  sport_slug: z.string().min(1, 'Sport slug is required'),
});

export async function createTeamAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/team');

  const parsed = schema.safeParse({
    name: formData.get('name'),
    sport_slug: formData.get('sport_slug'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid form');
  }

  const name = String(parsed.data.name).trim();
  const sport_slug = String(parsed.data.sport_slug).trim().toLowerCase();

  // Exact slug match
  let { data: sport, error } = await supabase
    .from('sports')
    .select('id')
    .eq('slug', sport_slug)
    .single();

  // Optional fallback: ilike
  if (error || !sport?.id) {
    const { data: s2 } = await supabase
      .from('sports')
      .select('id')
      .ilike('slug', sport_slug)
      .single();
    sport = s2 ?? null;
  }

  if (!sport?.id) {
    throw new Error('Invalid sport selected');
  }

  // INSERT and get the new team's id in one step
  const { data: inserted, error: insErr } = await supabase
    .from('teams')
    .insert({
      created_by: user.id,
      sport_id: sport.id,
      name,
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    throw new Error(insErr?.message || 'Failed to create team');
  }

  revalidatePath('/dashboard/team');
  revalidatePath(`/dashboard/team/${inserted.id}`);
  redirect(`/dashboard/team/${inserted.id}`);
}
