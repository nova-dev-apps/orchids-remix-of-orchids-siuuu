import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Old credentials
const oldUrl = 'https://stbwwyowskyjyaxytzde.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Ynd3eW93c2t5anlheHl0emRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3ODQ1NSwiZXhwIjoyMDgyNzU0NDU1fQ.wPKkWdFh4CvsIPBwFbrtVRIlfN5GTF6p5fn3FzVW7Qo';

// New credentials
const newUrl = process.env.VITE_SUPABASE_URL;
const newKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const oldSupabase = createClient(oldUrl, oldKey);
const newSupabase = createClient(newUrl, newKey);

async function transferData() {
  const tables = ['users', 'ai_behavior_settings', 'ai_config', 'global_token_limits', 'paypal_config', 'user_token_balances'];
  
  console.log('Starting data transfer...');
  for (const table of tables) {
    console.log(`Processing table "${table}"...`);
    
    // Fetch from old
    const { data: oldData, error: fetchError } = await oldSupabase.from(table).select('*');
    if (fetchError) {
      console.error(`Error fetching from old table "${table}":`, fetchError.message);
      continue;
    }
    
    if (!oldData || oldData.length === 0) {
      console.log(`Table "${table}" is empty in old project.`);
      continue;
    }

    console.log(`Fetched ${oldData.length} rows from old table "${table}".`);

    // Insert into new
    const { error: insertError } = await newSupabase.from(table).upsert(oldData);
    if (insertError) {
      console.error(`Error inserting into new table "${table}":`, insertError.message);
    } else {
      console.log(`Successfully transferred data for table "${table}".`);
    }
  }
  console.log('Data transfer finished.');
}

transferData();
