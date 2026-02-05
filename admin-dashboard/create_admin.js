
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'admin@khanmotors.cloud';
const password = 'password123'; // Temporary password
const fullName = 'Khan Motors Admin';

async function createAdmin() {
  console.log(`Creating user: ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.error('Error creating user:', error.message);
    return;
  }

  console.log('User created successfully!');
  console.log('User ID:', data.user.id);
  console.log('-----------------------------------');
  console.log('IMPORTANT:');
  console.log('1. If email confirmation is enabled, please check your inbox.');
  console.log('2. You must run the following SQL in Supabase Dashboard -> SQL Editor to grant Admin permissions:');
  console.log(`
    UPDATE public.admin_users
    SET role = 'super_admin', status = 'approved'
    WHERE email = '${email}';
  `);
}

createAdmin();
