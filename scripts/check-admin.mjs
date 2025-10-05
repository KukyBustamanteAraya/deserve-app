import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const userId = 'd4688023-0cd9-4875-94ed-33e98b010a15';

console.log('\n=== Admin Diagnostic Check ===\n');

// 1. Check if profile exists
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, is_admin')
  .eq('id', userId)
  .single();

console.log('1. Profile query result:');
console.log('   Data:', profile);
console.log('   Error:', profileError);

// 2. Check RLS policies
const { data: policies, error: policiesError } = await supabase
  .from('pg_policies')
  .select('*')
  .eq('schemaname', 'public')
  .eq('tablename', 'profiles');

console.log('\n2. RLS policies on profiles table:');
console.log('   Data:', policies);
console.log('   Error:', policiesError);

// 3. Try to read all profiles (to see if RLS blocks it)
const { data: allProfiles, error: allError } = await supabase
  .from('profiles')
  .select('id, is_admin')
  .limit(5);

console.log('\n3. All profiles (limit 5):');
console.log('   Data:', allProfiles);
console.log('   Error:', allError);

console.log('\n=== End Diagnostic ===\n');
