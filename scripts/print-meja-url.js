const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function printCorrectUrls() {
  const { data: tables } = await supabase
    .from('tables')
    .select('name, token, shop_id')
    .eq('name', 'Meja-1')
    .single();

  if (tables) {
    console.log(`=== LINK ORDER YANG BENAR UNTUK ${tables.name} ===\n`);
    console.log(`Token Meja : ${tables.token}`);
    console.log(`Shop ID    : ${tables.shop_id}`);
    console.log(`URL browser: http://192.168.3.116:3000/order/${encodeURIComponent(tables.token)}\n`);
    console.log(`--------------------------------------------------`);
    console.log(`Buka URL browser di atas untuk memesan dari Meja-1!`);
  } else {
    console.log('Meja-1 tidak ditemukan di database.');
  }
}

printCorrectUrls();
