const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables dari .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase credentials tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Konfigurasi ──────────────────────────────────────────────────────────────

const BASE_URL = 'http://192.168.3.116:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'qrcodes');

const QR_OPTIONS = {
  type: 'png',
  width: 400,
  margin: 2,
  color: {
    dark: '#1A1A1A',
    light: '#F9F6EE',
  },
  errorCorrectionLevel: 'M',
};

// ─── Generate ─────────────────────────────────────────────────────────────────

async function generateQRCodes() {
  // Buat folder output kalau belum ada
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Folder dibuat: ${OUTPUT_DIR}`);
  }

  // Ambil data meja dan token statis dari Supabase
  console.log('🔄 Mengambil data meja dari Supabase...');
  const { data: tables, error } = await supabase
    .from('tables')
    .select('name, token')
    .order('name', { ascending: true });

  if (error || !tables) {
    console.error('❌ Gagal mengambil data meja:', error?.message);
    process.exit(1);
  }

  console.log(`\n🔄 Generating ${tables.length} QR Code Statis...\n`);

  // Hapus QR Code lama agar bersih
  const files = fs.readdirSync(OUTPUT_DIR);
  for (const file of files) {
    if (file.endsWith('.png')) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }

  for (const table of tables) {
    const url = `${BASE_URL}/order/${encodeURIComponent(table.token)}`;
    const outputPath = path.join(OUTPUT_DIR, `qr-${table.name}.png`);

    try {
      await QRCode.toFile(outputPath, url, QR_OPTIONS);
      console.log(`  ✅ ${table.name} (${table.token.substring(0, 8)}...)  →  ${outputPath}`);
    } catch (err) {
      console.error(`  ❌ ${table.name} gagal:`, err.message);
    }
  }

  console.log(`\n✨ Selesai! File PNG statis ter-update di:\n   ${OUTPUT_DIR}\n`);
}

generateQRCodes();
