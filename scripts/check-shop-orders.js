const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSpecificShopOrders() {
  const shopId = '4ba143cd-a2cc-4a54-b573-7658f716f0c0'; // Bento Jakal
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, table_number, total_price, customer_name, status, created_at')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  console.log(`=== DAFTAR PESANAN UNTUK SHOP: ${shopId} ===\n`);
  if (error) {
    console.error('Error fetching orders:', error.message);
  } else if (!orders || orders.length === 0) {
    console.log('Belum ada pesanan terdaftar di toko ini.');
  } else {
    orders.forEach((o, index) => {
      console.log(`${index+1}. ORDER ID : ${o.id}`);
      console.log(`   Pelanggan: ${o.customer_name}`);
      console.log(`   Meja     : ${o.table_number}`);
      console.log(`   Total    : Rp ${o.total_price}`);
      console.log(`   Status   : ${o.status}`);
      console.log(`   Waktu    : ${o.created_at}\n`);
    });
  }
}

checkSpecificShopOrders();
