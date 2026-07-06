const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function simulateCheckout() {
  console.log('🧪 Mensimulasikan insert order baru dari pelanggan...');
  
  // Menggunakan Shop ID Bento Jakal yang valid
  const testShopId = '4ba143cd-a2cc-4a54-b573-7658f716f0c0';

  const { data, error } = await supabase
    .from('orders')
    .insert({
      table_number: 'Meja-1',
      total_price: 25000,
      status: 'pending',
      customer_name: 'Tester Pelanggan',
      payment_method: 'qris',
      shop_id: testShopId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Gagal melakukan checkout (Insert orders):');
    console.error(error);
  } else {
    console.log('✅ Sukses melakukan checkout! Order ID:', data.id);
  }
}

simulateCheckout();
