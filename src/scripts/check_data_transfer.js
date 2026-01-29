import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Old credentials (hardcoded for transfer)
const oldUrl = 'https://stbwwyowskyjyaxytzde.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Ynd3eW93c2t5anlheHl0emRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3ODQ1NSwiZXhwIjoyMDgyNzU0NDU1fQ.wPKkWdFh4CvsIPBwFbrtVRIlfN5GTF6p5fn3FzVW7Qo';

// New credentials
const newUrl = process.env.VITE_SUPABASE_URL;
const newKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const oldSupabase = createClient(oldUrl, oldKey);
const newSupabase = createClient(newUrl, newKey);

async function checkData() {
  const tables = ['users', 'ai_behavior_settings', 'ai_config', 'global_token_limits', 'paypal_config', 'user_token_balances'];
  
  console.log('Comparing data counts:');
  for (const table of tables) {
    const { count: oldCount } = await oldSupabase.from(table).select('*', { count: 'exact', head: true });
    const { count: newCount } = await newSupabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table "${table}": Old=${oldCount}, New=${newCount}`);
  }
}

checkData();
