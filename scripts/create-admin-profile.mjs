import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const userId = 'd4688023-0cd9-4875-94ed-33e98b010a15';
const userEmail = 'kukybusta@gmail.com'; // Update if needed

console.log('\n=== Creating Admin Profile ===\n');

// Insert profile with admin role
// Using only columns that exist: id, full_name, role
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: userId,
    full_name: userEmail,
    role: 'admin',
  })
  .select()
  .single();

if (error) {
  console.error('Error creating profile:', error);
} else {
  console.log('✅ Admin profile created successfully!');
  console.log('Profile:', data);
}

// Verify it was created
const { data: verifyData, error: verifyError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

console.log('\n=== Verification ===');
if (verifyError) {
  console.error('Error verifying profile:', verifyError);
} else {
  console.log('✅ Profile verified:');
  console.log('  ID:', verifyData.id);
  console.log('  Email:', verifyData.email);
  console.log('  Role:', verifyData.role);
  console.log('  Full Name:', verifyData.full_name);
}

console.log('\n=== Done ===\n');
