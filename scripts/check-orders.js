const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables dari .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrdersAndItems() {
  console.log('🔍 Mengambil order terbaru beserta item-itemnya...');
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, table_number, total_price, status, receipt_path')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Gagal mengambil data order:', error.message);
    return;
  }

  for (const o of orders) {
    console.log(`\n========================================`);
    console.log(`ORDER ID    : ${o.id}`);
    console.log(`Meja        : ${o.table_number}`);
    console.log(`Total       : ${o.total_price}`);
    console.log(`Status      : ${o.status}`);
    console.log(`Bukti Path  : ${o.receipt_path || 'NULL'}`);
    
    // Ambil order_items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, menu_name, price, quantity')
      .eq('order_id', o.id);

    if (itemsError) {
      console.error(`  ❌ Gagal mengambil item:`, itemsError.message);
    } else {
      console.log(`Item-item:`);
      if (items.length === 0) {
        console.log(`  (KOSONG - Tidak ada item menu di database)`);
      } else {
        items.forEach((it) => {
          console.log(`  - ${it.quantity}x ${it.menu_name} (Rp ${it.price})`);
        });
      }
    }
  }
}

checkOrdersAndItems();
