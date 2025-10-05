import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const userId = 'd4688023-0cd9-4875-94ed-33e98b010a15';

console.log('\n=== Discovering Profiles Schema ===\n');

// Try inserting with just the ID to see what fields are required
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: userId,
  })
  .select()
  .single();

console.log('Insert result with just ID:');
console.log('Data:', data);
console.log('Error:', error);

// If it worked, try to see what was created
if (!error) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('\nFull profile created:');
  console.log(JSON.stringify(profile, null, 2));
}

console.log('\n=== Done ===\n');
