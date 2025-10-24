import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAdmin(email) {
  console.log(`Adding admin privileges to: ${email}`);

  // First check if user exists in auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  const user = authUsers.users.find(u => u.email === email);

  if (!user) {
    console.error(`User with email ${email} not found in auth.users`);
    console.log('User must sign up first before being made admin');
    return;
  }

  console.log(`Found user: ${user.id} (${user.email})`);

  // Update or insert profile with admin privileges
  // Set both is_admin AND role for compatibility with both admin guards
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      is_admin: true,
      role: 'admin',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select();

  if (error) {
    console.error('Error updating profile:', error);
    return;
  }

  console.log('✓ Successfully added admin privileges!');
  console.log('Profile:', data);
}

addAdmin('mikael.s.haugen@gmail.com').then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
