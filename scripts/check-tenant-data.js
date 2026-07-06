const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTenantData() {
  console.log('=== DIAGNOSTIK DATA MULTI-TENANT ===\n');

  // 1. Cek Toko (Shops)
  const { data: shops } = await supabase.from('shops').select('id, name, join_code');
  console.log('1. DAFTAR TOKO (SHOPS):');
  if (!shops || shops.length === 0) {
    console.log('   (KOSONG - Belum ada toko yang terdaftar)');
  } else {
    shops.forEach(s => console.log(`   - Toko: "${s.name}" | ID: ${s.id} | Join Code: ${s.join_code}`));
  }

  // 2. Cek Profil Pengguna (Profiles)
  const { data: profiles } = await supabase.from('profiles').select('id, email, role, shop_id');
  console.log('\n2. DAFTAR PROFIL PENGGUNA (PROFILES):');
  if (!profiles || profiles.length === 0) {
    console.log('   (KOSONG - Belum ada profil)');
  } else {
    profiles.forEach(p => console.log(`   - Email: ${p.email} | Role: ${p.role} | Shop ID: ${p.shop_id || 'NULL'}`));
  }

  // 3. Cek Meja (Tables)
  const { data: tables } = await supabase.from('tables').select('id, name, shop_id');
  console.log('\n3. DAFTAR MEJA (TABLES):');
  if (!tables || tables.length === 0) {
    console.log('   (KOSONG - Belum ada meja)');
  } else {
    tables.forEach(t => console.log(`   - Meja: "${t.name}" | ID: ${t.id} | Shop ID: ${t.shop_id || 'NULL'}`));
  }

  // 4. Cek Menu
  const { data: menus } = await supabase.from('menus').select('id, name, shop_id');
  console.log('\n4. DAFTAR MENU (MENUS):');
  if (!menus || menus.length === 0) {
    console.log('   (KOSONG - Belum ada menu)');
  } else {
    menus.forEach(m => console.log(`   - Menu: "${m.name}" | ID: ${m.id} | Shop ID: ${m.shop_id || 'NULL'}`));
  }

  // 5. Cek Pesanan (Orders)
  const { data: orders } = await supabase.from('orders').select('id, table_number, total_price, shop_id');
  console.log('\n5. DAFTAR PESANAN TERBARU (ORDERS):');
  if (!orders || orders.length === 0) {
    console.log('   (KOSONG - Belum ada pesanan)');
  } else {
    orders.slice(0, 5).forEach(o => console.log(`   - Order Meja: "${o.table_number}" | Total: Rp ${o.total_price} | Shop ID: ${o.shop_id || 'NULL'}`));
  }
}

checkTenantData();
