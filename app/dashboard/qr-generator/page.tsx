'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { supabase } from '../../../src/lib/supabase';

interface TableDB {
  id: number;
  name: string;
  token: string;
  is_active: boolean;
}

import { AlertIcon, EditIcon, PlayIcon, PauseIcon, TrashIcon } from '../../components/Icons';

export default function QRGeneratorPage() {
  const [tables, setTables] = useState<TableDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [maxTables, setMaxTables] = useState<number>(10);
  const [alertMsg, setAlertMsg] = useState<{title: string, message: string, type: 'error' | 'success'} | null>(null);
  
  // Edit State
  const [editingTable, setEditingTable] = useState<TableDB | null>(null);
  const [editName, setEditName] = useState('');

  // Bulk Generator States
  const [addingMode, setAddingMode] = useState<'single' | 'bulk'>('single');
  const [bulkPrefix, setBulkPrefix] = useState('Meja');
  const [bulkQuantity, setBulkQuantity] = useState(10);

  // Template States
  const [selectedTemplate, setSelectedTemplate] = useState<'minimalist' | 'vintage' | 'dark' | 'tent'>('minimalist');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<'selected' | 'all'>('selected');
  const [isPrinting, setIsPrinting] = useState(false);

  const templates = [
    { id: 'minimalist', name: 'Minimalist Clean', desc: 'Desain bersih, modern, dan simple.', emoji: '⬜' },
    { id: 'vintage', name: 'Vintage Cafe', desc: 'Klasik hangat bernuansa krem & cokelat.', emoji: '🟫' },
    { id: 'dark', name: 'Elegant Dark', desc: 'Tampilan premium gelap dengan aksen emas.', emoji: '⬛' },
    { id: 'tent', name: 'Tent Card (Fold)', desc: 'Kartu lipat meja berdiri berinstruksi.', emoji: '⛺' },
  ];

  function parseTableName(tableName: string) {
    const numberMatch = tableName.match(/\d+$/);
    const number = numberMatch ? numberMatch[0] : '';
    const namePrefix = tableName.replace(/[-_ ]*\d+$/, '').trim();
    return { namePrefix, number };
  }

  const appDomain =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://qreats.vercel.app';

  // Load user shop_id
  useEffect(() => {
    async function loadShop() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('role, shop_id')
        .eq('id', session.user.id)
        .single();
      
      if (prof) {
        setUserRole(prof.role);
        let activeShopId = prof.shop_id;
        if (prof.role === 'superadmin') {
          activeShopId = localStorage.getItem('impersonated_shop_id');
        }
        setShopId(activeShopId);

        if (activeShopId) {
          const { data: s } = await supabase
            .from('shops')
            .select('name, base_table_limit, addon_tables')
            .eq('id', activeShopId)
            .single();
          if (s) {
            setShopName(s.name);
            setMaxTables((s.base_table_limit || 20) + (s.addon_tables || 0));
          }
        }
      }
    }
    loadShop();
  }, []);

  // Trigger print after React updates DOM
  useEffect(() => {
    if (isPrinting) {
      window.print();
      setIsPrinting(false);
    }
  }, [isPrinting]);

  // Fetch semua meja khusus toko ini dari Supabase
  const fetchTables = async () => {
    if (!shopId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('shop_id', shopId)
      .order('name', { ascending: true });

    if (!error && data) {
      setTables(data);
      // Default pilih semua meja untuk dicetak
      setSelectedIds(data.map((t) => t.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (shopId) {
      fetchTables();
    }
  }, [shopId]);

  // Toggle pilih/hapus meja dari daftar cetak
  function toggleTable(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Tambah meja baru ke database (akan langsung generate UUID baru otomatis)
  async function handleAddTable() {
    const name = newTableName.trim();
    if (!name || !shopId) return;
    
    const activeTablesCount = tables.filter(t => t.is_active).length;
    
    if (activeTablesCount >= maxTables) {
      setAlertMsg({
        title: 'Batas Meja Tercapai',
        message: `Batas maksimal meja aktif tercapai (${maxTables} meja). Nonaktifkan meja lain atau hubungi Superadmin untuk upgrade kuota.`,
        type: 'error'
      });
      return;
    }
    
    setGenerating(true);

    const { error } = await supabase
      .from('tables')
      .insert({
        name: name,
        shop_id: shopId,
      });

    if (!error) {
      setNewTableName('');
      await fetchTables();
    } else {
      setAlertMsg({
        title: 'Gagal Menambah Meja',
        message: error.message,
        type: 'error'
      });
    }
    setGenerating(false);
  }

  // Tambah meja baru massal (Bulk) ke database
  async function handleAddBulkTables() {
    const prefix = bulkPrefix.trim();
    const qty = Number(bulkQuantity);
    if (!prefix || !shopId || qty < 1) {
      setAlertMsg({ title: 'Input Tidak Valid', message: 'Prefix nama meja dan jumlah wajib diisi dengan benar.', type: 'error' });
      return;
    }
    if (qty > 100) {
      setAlertMsg({ title: 'Jumlah Terlalu Banyak', message: 'Jumlah meja maksimal sekali cetak adalah 100.', type: 'error' });
      return;
    }
    
    const activeTablesCount = tables.filter(t => t.is_active).length;
    
    if (activeTablesCount + qty > maxTables) {
      setAlertMsg({
        title: 'Batas Meja Tercapai',
        message: `Gagal! Menambah ${qty} meja aktif akan melebihi batas maksimal Anda (${maxTables} meja). Anda saat ini memiliki ${activeTablesCount} meja aktif.`,
        type: 'error'
      });
      return;
    }
    
    setGenerating(true);

    const tablesToInsert = [];
    for (let i = 1; i <= qty; i++) {
      const finalName = prefix.endsWith('-') || prefix.endsWith(' ') || prefix.endsWith('_')
        ? `${prefix}${i}`
        : `${prefix}-${i}`;
      
      tablesToInsert.push({
        name: finalName,
        shop_id: shopId,
      });
    }

    const { error } = await supabase
      .from('tables')
      .insert(tablesToInsert);

    if (!error) {
      setBulkPrefix('Meja');
      setBulkQuantity(10);
      await fetchTables();
    } else {
      setAlertMsg({ title: 'Gagal Menambah Massal', message: error.message, type: 'error' });
    }
    setGenerating(false);
  }

  // ─── Edit, Delete, Toggle Handlers ─────────────────────────────────────────

  async function handleToggleTableActive(table: TableDB) {
    const isActivating = !table.is_active;
    
    // Check limit if turning ON
    if (isActivating) {
      const activeTablesCount = tables.filter(t => t.is_active).length;
      if (activeTablesCount >= maxTables) {
        setAlertMsg({
          title: 'Gagal Mengaktifkan Meja',
          message: `Batas maksimal meja aktif tercapai (${maxTables} meja). Anda tidak bisa mengaktifkan meja ini sebelum menonaktifkan meja lain.`,
          type: 'error'
        });
        return;
      }
    }

    const { error } = await supabase
      .from('tables')
      .update({ is_active: isActivating })
      .eq('id', table.id);

    if (error) {
      setAlertMsg({ title: 'Gagal Memperbarui', message: error.message, type: 'error' });
    } else {
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: isActivating } : t));
    }
  }

  async function handleDeleteTable(table: TableDB) {
    if (!confirm(`Yakin ingin menghapus meja "${table.name}"? Aksi ini mungkin gagal jika ada pesanan terkait meja ini.`)) {
      return;
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', table.id);

    if (error) {
      setAlertMsg({ 
        title: 'Gagal Menghapus Meja', 
        message: error.message.includes('foreign key constraint') 
          ? 'Meja ini memiliki riwayat pesanan dan tidak dapat dihapus. Silakan "Matikan" (Nonaktifkan) meja ini sebagai gantinya.' 
          : error.message, 
        type: 'error' 
      });
    } else {
      setTables(prev => prev.filter(t => t.id !== table.id));
      setSelectedIds(prev => prev.filter(id => id !== table.id));
    }
  }

  async function handleSaveEdit() {
    if (!editingTable || !editName.trim()) return;

    const { error } = await supabase
      .from('tables')
      .update({ name: editName.trim() })
      .eq('id', editingTable.id);

    if (error) {
      setAlertMsg({ title: 'Gagal Menyimpan', message: error.message, type: 'error' });
    } else {
      setTables(prev => prev.map(t => t.id === editingTable.id ? { ...t, name: editName.trim() } : t));
      setEditingTable(null);
    }
  }

  async function downloadSinglePNG(table: TableDB) {
    const canvas = document.createElement('canvas');
    canvas.width = 800; // High resolution
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const url = `${appDomain}/order/${encodeURIComponent(table.token)}`;
    const { namePrefix, number } = parseTableName(table.name);

    if (selectedTemplate === 'vintage') {
      ctx.fillStyle = '#FAF6EE';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#5C4033';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      ctx.fillStyle = '#5C4033';
      ctx.textAlign = 'center';
      ctx.font = 'italic bold 28px Georgia, serif';
      ctx.fillText('WELCOME TO', canvas.width / 2, 120);

      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText((shopName || 'QREats Cafe').toUpperCase(), canvas.width / 2, 180);

      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 100, 210);
      ctx.lineTo(canvas.width / 2 + 100, 210);
      ctx.strokeStyle = '#5C4033';
      ctx.stroke();

      const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10 });
      const img = new Image();
      img.src = qrImage;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.drawImage(img, canvas.width / 2 - 180, 280, 360, 360);

      ctx.font = 'italic 36px Georgia, serif';
      ctx.fillText(namePrefix || 'Table', canvas.width / 2, 750);
      ctx.font = 'bold 80px Georgia, serif';
      ctx.fillText(number ? `No. ${number}` : 'Meja', canvas.width / 2, 850);

      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillText('ORDER & PAY FROM TABLE', canvas.width / 2, 950);

    } else if (selectedTemplate === 'dark') {
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      ctx.fillStyle = '#D4AF37';
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('PREMIUM SELF ORDER', canvas.width / 2, 130);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 48px sans-serif';
      ctx.fillText((shopName || 'QREats Venue').toUpperCase(), canvas.width / 2, 195);

      const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10, color: { dark: '#1A1A1A', light: '#FFFFFF' } });
      const img = new Image();
      img.src = qrImage;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(canvas.width / 2 - 200, 270, 400, 400);
      ctx.drawImage(img, canvas.width / 2 - 180, 290, 360, 360);

      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(namePrefix || 'Table', canvas.width / 2, 770);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 90px sans-serif';
      ctx.fillText(number ? `#${number}` : 'Meja', canvas.width / 2, 875);

      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('SCAN TO ORDER & PAY', canvas.width / 2, 970);

    } else if (selectedTemplate === 'tent') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      ctx.beginPath();
      ctx.setLineDash([15, 15]);
      ctx.moveTo(20, canvas.height / 2);
      ctx.lineTo(canvas.width - 20, canvas.height / 2);
      ctx.strokeStyle = '#CCCCCC';
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 4);
      ctx.rotate(Math.PI);
      ctx.fillStyle = '#1A1A1A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText((shopName || 'QREats Cafe').toUpperCase(), 0, -60);
      ctx.fillStyle = '#888888';
      ctx.font = 'normal 20px sans-serif';
      ctx.fillText('Selamat datang! Silakan scan QR code di sisi', 0, 0);
      ctx.fillText('sebaliknya untuk memesan mandiri dari meja Anda.', 0, 35);
      ctx.restore();

      const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10 });
      const img = new Image();
      img.src = qrImage;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.drawImage(img, canvas.width / 2 - 140, canvas.height / 2 + 60, 280, 280);

      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(namePrefix || 'Table', canvas.width / 2, canvas.height / 2 + 390);
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText(number ? `Meja ${number}` : 'Meja', canvas.width / 2, canvas.height / 2 + 460);

    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('SELF ORDER QR', canvas.width / 2, 130);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText((shopName || 'QREats Merchant').toUpperCase(), canvas.width / 2, 190);

      const qrImage = await QRCode.toDataURL(url, { margin: 1, scale: 10 });
      const img = new Image();
      img.src = qrImage;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.drawImage(img, canvas.width / 2 - 180, 270, 360, 360);

      ctx.fillStyle = '#666666';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(namePrefix || 'Meja', canvas.width / 2, 750);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 80px sans-serif';
      ctx.fillText(number ? `No. ${number}` : 'Meja', canvas.width / 2, 850);

      ctx.fillStyle = '#888888';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('SCAN TO ORDER & PAY', canvas.width / 2, 950);
    }

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR-${table.name}-${selectedTemplate}.png`;
    link.href = dataURL;
    link.click();
  }

  async function handleDownloadPNGs(scope: 'selected' | 'all') {
    const listToDownload = scope === 'all' ? tables : selectedTablesData;
    if (listToDownload.length === 0) return;
    setGenerating(true);
    setShowPrintModal(false);
    try {
      for (let i = 0; i < listToDownload.length; i++) {
        const table = listToDownload[i];
        await downloadSinglePNG(table);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengunduh PNG');
    }
    setGenerating(false);
  }

  function handleSelectAll() {
    setSelectedIds(tables.map((t) => t.id));
  }

  function handleDeselectAll() {
    setSelectedIds([]);
  }

  function handlePrint(scope: 'selected' | 'all') {
    setPrintScope(scope);
    setIsPrinting(true);
    setShowPrintModal(false);
  }

  const selectedTablesData = tables.filter((t) => selectedIds.includes(t.id));
  const tablesToRender = isPrinting && printScope === 'all' ? tables : selectedTablesData;

  return (
    <div className="bg-[#F5F2EB]">
      {/* Custom Alert Modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAlertMsg(null)} />
          <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl p-6 text-center border border-[#1A1A1A]/10 animate-fade-in-up">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${alertMsg.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
               <AlertIcon className="w-8 h-8" />
            </div>
            <h3 className="font-black text-lg text-[#1A1A1A] mb-2">{alertMsg.title}</h3>
            <p className="text-sm text-[#1A1A1A]/60 leading-relaxed mb-6">{alertMsg.message}</p>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">QR Code Generator</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5 flex gap-2">
            <span>{selectedIds.length} dicetak</span>
            <span>&bull;</span>
            <span>{tables.filter(t => t.is_active).length} meja aktif (Kuota: {maxTables})</span>
          </p>
        </div>
        {selectedIds.length > 0 && (
          <button
            id="btn-print"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all"
          >
            🖨️ Cetak QR
          </button>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Info card tentang cara akses */}
        <div className="bg-[#1A1A1A] text-white rounded-2xl p-5 mb-6 print:hidden">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0"><AlertIcon className="w-8 h-8 text-amber-600" /></div>
            <div>
              <h2 className="font-semibold text-base mb-1">QR Code Unik & Statis</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Setiap meja memiliki UUID token permanen (statis) di database. QR Code yang dicetak 
                menggunakan token ini sehingga tidak bisa ditebak atau dimanipulasi oleh meja lain.
              </p>
              {tables.length > 0 && (
                <p className="text-white/50 text-xs mt-2">
                  Contoh Link Meja-01:{' '}
                  <a
                    href={`/order/${tables[0]?.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline underline-offset-2 hover:text-white/80 transition-colors"
                  >
                    /order/{tables[0]?.token?.substring(0, 8)}... (Meja-01)
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preset Meja dari DB */}
        <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-6 mb-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#1A1A1A]">Pilih Meja untuk Dicetak</h2>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Semua data dimuat langsung dari Supabase.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 border border-[#1A1A1A]/20 rounded-lg text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors"
              >
                Pilih Semua
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 border border-[#1A1A1A]/20 rounded-lg text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-10 bg-[#F5F2EB] rounded-xl animate-pulse" />
          ) : tables.length === 0 ? (
            <p className="text-sm text-[#1A1A1A]/40">Belum ada meja. Silakan tambah di bawah.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tables.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    id={`btn-table-${t.id}`}
                    onClick={() => toggleTable(t.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-[#F5F2EB] text-[#1A1A1A]/50 border-transparent hover:border-[#1A1A1A]/20'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

          <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-6 mb-8 print:hidden">
            <h2 className="font-semibold text-[#1A1A1A] mb-1">Kelola & Tambah Meja</h2>
            <p className="text-xs text-[#1A1A1A]/40 mb-4">
              Pilih mode penambahan meja: satu per satu atau generate secara massal.
            </p>

            {/* Toggle Mode */}
            <div className="grid grid-cols-2 gap-2 bg-[#F5F2EB] p-1 rounded-xl mb-4 max-w-xs">
              <button
                type="button"
                onClick={() => setAddingMode('single')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  addingMode === 'single' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                }`}
              >
                ➕ Tambah Satu
              </button>
              <button
                type="button"
                onClick={() => setAddingMode('bulk')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  addingMode === 'bulk' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                }`}
              >
                🖨️ Cetak & Tambah Massal
              </button>
            </div>

            {addingMode === 'single' ? (
              <div className="flex gap-3">
                <input
                  id="input-new-table"
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
                  placeholder="Meja-11..."
                  className="flex-1 px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all font-mono"
                />
                <button
                  id="btn-add-table"
                  onClick={handleAddTable}
                  disabled={generating}
                  className="px-6 py-3 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all disabled:opacity-50"
                >
                  {generating ? 'Membuat...' : 'Tambah Meja'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide mb-1">Prefix Nama Meja</label>
                  <input
                    id="input-bulk-prefix"
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="Contoh: Meja, VIP, Teras..."
                    className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all font-mono"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide mb-1">Jumlah Meja</label>
                  <input
                    id="input-bulk-qty"
                    type="number"
                    min="1"
                    max="100"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    id="btn-add-bulk"
                    onClick={handleAddBulkTables}
                    disabled={generating}
                    className="w-full sm:w-auto px-6 py-3.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {generating ? 'Memproses...' : 'Generate & Tambah'}
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Pilihan Template QR */}
        <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-6 mb-6 print:hidden">
          <h2 className="font-semibold text-[#1A1A1A] mb-1">Pilih Template Desain QR</h2>
          <p className="text-xs text-[#1A1A1A]/40 mb-4">Pilih gaya visual yang akan dicetak atau disimpan ke PDF.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id as any)}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 hover:shadow-sm ${
                  selectedTemplate === tpl.id
                    ? 'border-[#1A1A1A] bg-[#1A1A1A]/5 ring-1 ring-[#1A1A1A]'
                    : 'border-[#1A1A1A]/10 bg-white hover:border-[#1A1A1A]/30'
                }`}
              >
                <span className="text-2xl mt-0.5">{tpl.emoji}</span>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">{tpl.name}</h3>
                  <p className="text-[11px] text-[#1A1A1A]/50 mt-1 leading-snug">{tpl.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Grid */}
        {tablesToRender.length > 0 ? (
          <>
            <p className="text-sm text-[#1A1A1A]/40 mb-4 print:hidden">
              Menampilkan {tablesToRender.length} QR Code siap cetak
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4 print:w-full">
              {tablesToRender.map((t) => {
                const url = `${appDomain}/order/${encodeURIComponent(t.token)}`;
                const { namePrefix, number } = parseTableName(t.name);
                
                let cardContent = null;
                
                if (selectedTemplate === 'vintage') {
                  cardContent = (
                    <div
                      key={t.id}
                      id={`qr-card-${t.name}`}
                      className="bg-[#FAF6EE] border-4 double border-[#5C4033] rounded-3xl p-6 flex flex-col items-center justify-between text-[#5C4033] w-full min-h-[360px] shadow-sm relative qr-card-print group hover:shadow-md transition-all duration-300"
                    >
                      {/* Decorative border */}
                      <div className="absolute inset-1 border border-[#5C4033]/20 rounded-2xl pointer-events-none" />
                      
                      {/* Top Header */}
                      <div className="text-center w-full pt-1">
                        <p className="text-[9px] font-bold tracking-widest uppercase font-serif italic text-[#5C4033]/60">Welcome to</p>
                        <h3 className="text-sm font-bold font-serif tracking-tight mt-0.5 truncate uppercase">{shopName || 'QREats Cafe'}</h3>
                        <div className="w-16 h-[1px] bg-[#5C4033]/35 mx-auto mt-1" />
                      </div>
                      
                      {/* QR Code */}
                      <div className="p-3 bg-[#FAF6EE] border-2 border-[#5C4033] rounded-2xl my-3">
                        <QRCodeSVG value={url} size={120} bgColor="#FAF6EE" fgColor="#5C4033" level="H" />
                      </div>
                      
                      {/* Bottom Footer */}
                      <div className="text-center w-full pb-1">
                        <p className="text-xs font-serif italic text-[#5C4033]/70">{namePrefix || 'Table'}</p>
                        <p className="text-3xl font-black font-serif mt-0.5">{number ? `No. ${number}` : 'Meja'}</p>
                        <p className="text-[8px] uppercase tracking-widest mt-2.5 font-bold text-[#5C4033]/45 print:hidden">Scan to Order & Pay</p>
                        <a
                          href={`/order/${t.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-[10px] text-[#5C4033]/60 font-semibold underline underline-offset-2 hover:text-[#5C4033] transition-colors print:hidden"
                        >
                          Buka Link ↗
                        </a>
                      </div>
                    </div>
                  );
                } else if (selectedTemplate === 'dark') {
                  cardContent = (
                    <div
                      key={t.id}
                      id={`qr-card-${t.name}`}
                      className="bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-3xl p-6 flex flex-col items-center justify-between text-white w-full min-h-[360px] shadow-md relative qr-card-print group hover:shadow-lg transition-all duration-300"
                    >
                      {/* Top Header */}
                      <div className="text-center w-full">
                        <p className="text-[9px] font-black tracking-widest text-[#D4AF37] uppercase">PREMIUM SELF ORDER</p>
                        <h3 className="text-xs font-black tracking-tight mt-1 truncate uppercase">{shopName || 'QREats Venue'}</h3>
                      </div>
                      
                      {/* QR Code */}
                      <div className="p-3 bg-white rounded-2xl my-4 ring-2 ring-[#D4AF37]/30">
                        <QRCodeSVG value={url} size={120} bgColor="#FFFFFF" fgColor="#1A1A1A" level="H" />
                      </div>
                      
                      {/* Bottom Footer */}
                      <div className="text-center w-full">
                        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{namePrefix || 'Table'}</p>
                        <p className="text-4xl font-extrabold tracking-tighter mt-1 text-white">{number ? `#${number}` : 'Meja'}</p>
                        <p className="text-[8px] text-[#D4AF37] uppercase tracking-widest font-bold mt-2.5 print:hidden">Scan to Order & Pay</p>
                        <a
                          href={`/order/${t.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-[10px] text-white/50 font-semibold underline underline-offset-2 hover:text-white transition-colors print:hidden"
                        >
                          Buka Link ↗
                        </a>
                      </div>
                    </div>
                  );
                } else if (selectedTemplate === 'tent') {
                  cardContent = (
                    <div
                      key={t.id}
                      id={`qr-card-${t.name}`}
                      className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 flex flex-col items-center justify-between text-[#1A1A1A] w-full min-h-[480px] shadow-sm relative qr-card-print group hover:shadow-md transition-all duration-300"
                    >
                      {/* Fold Line */}
                      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-300 flex items-center justify-center pointer-events-none">
                        <span className="bg-white px-2 text-[8px] font-bold text-gray-400 tracking-wider uppercase -mt-2">Garis Lipat / Fold Here</span>
                      </div>

                      {/* Back Side (Rotated 180deg) */}
                      <div className="w-full text-center flex flex-col items-center justify-center transform rotate-180 h-1/2 pb-6 border-b border-gray-100/50">
                        <h3 className="text-sm font-black tracking-tight mb-1 truncate text-gray-600 uppercase">{shopName || 'QREats Cafe'}</h3>
                        <p className="text-[9px] text-gray-400 font-bold max-w-[200px] leading-relaxed">
                          Selamat datang! Silakan scan QR code di sisi sebaliknya untuk memesan mandiri dari meja Anda.
                        </p>
                      </div>

                      {/* Front Side */}
                      <div className="w-full text-center flex flex-col items-center justify-between h-1/2 pt-6">
                        <div className="p-2.5 bg-[#FAF6EE] border border-gray-200 rounded-2xl mx-auto w-fit">
                          <QRCodeSVG value={url} size={90} bgColor="#FAF6EE" fgColor="#1A1A1A" level="H" />
                        </div>
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{namePrefix || 'Table'}</p>
                          <p className="text-2xl font-black tracking-tight text-black mt-0.5">{number ? `Meja ${number}` : 'Meja'}</p>
                          <a
                            href={`/order/${t.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1 text-[9px] text-gray-400 font-semibold underline underline-offset-2 hover:text-black transition-colors print:hidden"
                          >
                            Buka Link ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Minimalist Template (Default)
                  cardContent = (
                    <div
                    key={t.id}
                    id={`qr-card-${t.name}`}
                    className="bg-white border-2 border-black rounded-3xl p-6 flex flex-col items-center justify-between text-black w-full min-h-[360px] shadow-sm relative qr-card-print group hover:shadow-md transition-all duration-300"
                  >
                    {/* Top Header */}
                    <div className="text-center w-full">
                      <p className="text-[9px] font-black tracking-widest text-gray-400 uppercase">Self Order QR</p>
                      <h3 className="text-sm font-black tracking-tight mt-1 truncate uppercase">{shopName || 'QREats Merchant'}</h3>
                    </div>
                    
                    {/* QR Code */}
                    <div className="p-3 bg-[#FAF6EE] border border-gray-150 rounded-2xl my-4">
                      <QRCodeSVG value={url} size={120} bgColor="#FAF6EE" fgColor="#000000" level="H" />
                    </div>
                    
                    {/* Bottom Footer */}
                    <div className="text-center w-full">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{namePrefix || 'Meja'}</p>
                      <p className="text-3xl font-black tracking-tighter mt-0.5">{number ? `No. ${number}` : 'Meja'}</p>
                      <p className="text-[8px] text-gray-400 mt-2.5 font-bold uppercase tracking-wider print:hidden">Scan to Order & Pay</p>
                      <a
                        href={`/order/${t.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-[10px] text-gray-500 font-semibold underline underline-offset-2 hover:text-black transition-colors print:hidden"
                      >
                        Buka Link ↗
                      </a>
                    </div>
                  </div>
                  );
                }

                return (
                  <div key={t.id} className={`relative group transition-opacity duration-300 ${!t.is_active ? 'opacity-50 grayscale-[50%]' : ''}`}>
                    
                    {/* The actual QR Card Design */}
                    {cardContent}
                    
                    {/* Action Toolbar Overlay (Hover) */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-10">
                      <button
                        onClick={() => handleToggleTableActive(t)}
                        title={t.is_active ? 'Nonaktifkan Meja' : 'Aktifkan Meja'}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 text-[#1A1A1A] shadow-md backdrop-blur-md hover:bg-[#1A1A1A] hover:text-white transition-all border border-[#1A1A1A]/10"
                      >
                        {t.is_active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingTable(t);
                          setEditName(t.name);
                        }}
                        title="Edit Nama Meja"
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 text-[#1A1A1A] shadow-md backdrop-blur-md hover:bg-[#1A1A1A] hover:text-white transition-all border border-[#1A1A1A]/10"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTable(t)}
                        title="Hapus Meja"
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 text-red-500 shadow-md backdrop-blur-md hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Checkbox overlay for bulk printing */}
                    <div className="absolute top-4 left-4 z-10 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                       <input
                         type="checkbox"
                         checked={selectedIds.includes(t.id)}
                         onChange={() => toggleTable(t.id)}
                         className="w-5 h-5 accent-[#1A1A1A] cursor-pointer shadow-sm rounded-md"
                       />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-[#1A1A1A]/25">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-base font-medium">Tidak ada meja yang dipilih</p>
            <p className="text-sm mt-1">Pilih meja di atas untuk menampilkan QR Code</p>
          </div>
        )}
      </main>

      {/* Modal Edit Nama Meja */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingTable(null)} />
          <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl border border-[#1A1A1A]/10 p-6 space-y-6 animate-fade-in-up">
            <div className="text-center">
              <div className="w-12 h-12 bg-white border border-[#1A1A1A]/10 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-sm">
                <EditIcon className="w-6 h-6 text-[#1A1A1A]" />
              </div>
              <h3 className="font-bold text-[#1A1A1A] text-lg font-sans">Edit Nama Meja</h3>
              <p className="text-xs text-[#1A1A1A]/50 mt-1.5 leading-relaxed font-sans">
                Ubah nama atau nomor meja ini.
              </p>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide mb-1 font-sans">Nama Meja</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                className="w-full px-4 py-3 bg-white border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim() || editName.trim() === editingTable.name}
                className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-all active:scale-[0.98] disabled:opacity-50 font-sans"
              >
                Simpan Perubahan
              </button>
              <button
                onClick={() => setEditingTable(null)}
                className="w-full py-2.5 text-xs font-bold text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60 transition-colors cursor-pointer font-sans"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Pilihan */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPrintModal(false)} />
          <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl border border-[#1A1A1A]/10 p-6 space-y-6">
            <div className="text-center">
              <span className="text-4xl block mb-2">🖨️</span>
              <h3 className="font-bold text-[#1A1A1A] text-lg font-sans">Cetak QR Code</h3>
              <p className="text-xs text-[#1A1A1A]/50 mt-1.5 leading-relaxed font-sans">
                Tentukan cakupan meja dan format berkas cetak yang diinginkan.
              </p>
            </div>
            
            {/* Pilihan Cakupan Meja */}
            <div className="space-y-2 border-t border-b border-[#1A1A1A]/10 py-4">
              <p className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide font-sans">Cakupan Meja</p>
              <div className="grid grid-cols-2 gap-2 bg-[#F5F2EB] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPrintScope('all')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                    printScope === 'all' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                  }`}
                >
                  🌐 Semua ({tables.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPrintScope('selected')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                    printScope === 'selected' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                  }`}
                >
                  🎯 Terpilih ({selectedTablesData.length})
                </button>
              </div>
            </div>
            
            {/* Pilihan Format Unduh */}
            <div className="space-y-2">
              <button
                onClick={() => handlePrint(printScope)}
                className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                📄 Cetak / Simpan PDF
              </button>
              <button
                onClick={() => handleDownloadPNGs(printScope)}
                disabled={generating}
                className="w-full py-3.5 bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] text-sm font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-sans"
              >
                {generating ? 'Memproses Unduhan...' : '🖼️ Unduh Gambar (PNG)'}
              </button>
            </div>
            
            <button
              onClick={() => setShowPrintModal(false)}
              className="w-full py-2.5 text-xs font-bold text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60 transition-colors cursor-pointer font-sans"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden, [class*="print:hidden"], aside, header { display: none !important; }
          html, body, div, main {
            height: auto !important;
            overflow: visible !important;
          }
          main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; background: transparent !important; }
          .grid { 
            display: block !important;
            width: 100% !important;
          }
          .qr-card-print {
            display: inline-block !important;
            width: 48% !important;
            margin: 1% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border-style: solid !important;
            border-width: 2px !important;
            vertical-align: top !important;
          }
          /* Vintage Template print fix */
          .double {
            border-style: double !important;
            border-width: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
