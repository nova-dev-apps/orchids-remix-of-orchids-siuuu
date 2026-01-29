import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  console.log('Starting Supabase setup...');

  // Create buckets
  const buckets = ['user-accounts', 'ai-behavior-settings', 'user-data'];
  for (const bucketName of buckets) {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`Bucket "${bucketName}" already exists.`);
      } else {
        console.error(`Error creating bucket "${bucketName}":`, error.message);
      }
    } else {
      console.log(`Bucket "${bucketName}" created successfully.`);
    }
  }

  // Check if tables exist
  const tables = ['users', 'ai_behavior_settings', 'ai_config', 'global_token_limits', 'paypal_config', 'user_token_balances'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`Table "${table}" does not exist or is not accessible:`, error.message);
    } else {
      console.log(`Table "${table}" exists.`);
    }
  }

  console.log('Setup finished.');
}

setup();
