'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { AlertIcon } from '../../components/Icons';
import { QRTableList } from './_components/QRTableList';
import { QRTemplateCard } from './_components/QRTemplates';
import { downloadSinglePNG, TableDB } from './_components/QRCanvasUtils';

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

  const appDomain = typeof window !== 'undefined' ? window.location.origin : 'https://qreats.vercel.app';

  useEffect(() => {
    async function loadShop() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('role, shop_id').eq('id', session.user.id).single();
      if (prof) {
        setUserRole(prof.role);
        let activeShopId = prof.shop_id;
        if (prof.role === 'superadmin') activeShopId = localStorage.getItem('impersonated_shop_id');
        setShopId(activeShopId);
        if (activeShopId) {
          const { data: s } = await supabase.from('shops').select('name, base_table_limit, addon_tables').eq('id', activeShopId).single();
          if (s) {
            setShopName(s.name);
            setMaxTables((s.base_table_limit || 20) + (s.addon_tables || 0));
          }
        }
      }
    }
    loadShop();
  }, []);

  useEffect(() => {
    if (isPrinting) {
      window.print();
      setIsPrinting(false);
    }
  }, [isPrinting]);

  const fetchTables = async () => {
    if (!shopId) return;
    setLoading(true);
    const { data, error } = await supabase.from('tables').select('*').eq('shop_id', shopId).order('name', { ascending: true });
    if (!error && data) {
      setTables(data);
      setSelectedIds(data.map((t) => t.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (shopId) fetchTables();
  }, [shopId]);

  function toggleTable(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  async function handleAddTable() {
    const name = newTableName.trim();
    if (!name || !shopId) return;
    const activeTablesCount = tables.filter(t => t.is_active).length;
    if (activeTablesCount >= maxTables) {
      setAlertMsg({ title: 'Batas Meja Tercapai', message: `Batas maksimal meja aktif tercapai (${maxTables} meja).`, type: 'error' });
      return;
    }
    setGenerating(true);
    const { error } = await supabase.from('tables').insert({ name: name, shop_id: shopId });
    if (!error) {
      setNewTableName('');
      await fetchTables();
    } else {
      setAlertMsg({ title: 'Gagal Menambah', message: error.message, type: 'error' });
    }
    setGenerating(false);
  }

  async function handleAddBulkTables() {
    const prefix = bulkPrefix.trim();
    const qty = Number(bulkQuantity);
    if (!prefix || !shopId || qty < 1) return;
    const activeTablesCount = tables.filter(t => t.is_active).length;
    if (activeTablesCount + qty > maxTables) {
      setAlertMsg({ title: 'Batas Meja Tercapai', message: `Gagal! Maksimal ${maxTables} meja.`, type: 'error' });
      return;
    }
    setGenerating(true);
    const newTables = Array.from({ length: qty }).map((_, i) => {
      const highestNum = tables.reduce((acc, t) => {
        const match = t.name.match(/\d+$/);
        return match ? Math.max(acc, parseInt(match[0])) : acc;
      }, 0);
      return { name: `${prefix}-${String(highestNum + i + 1).padStart(2, '0')}`, shop_id: shopId };
    });
    const { error } = await supabase.from('tables').insert(newTables);
    if (!error) await fetchTables();
    else setAlertMsg({ title: 'Gagal', message: error.message, type: 'error' });
    setGenerating(false);
  }

  async function handleToggleTableActive(table: TableDB) {
    if (!table.is_active) {
      const activeTablesCount = tables.filter(t => t.is_active).length;
      if (activeTablesCount >= maxTables) {
         setAlertMsg({ title: 'Batas Meja Tercapai', message: `Maksimal ${maxTables} meja aktif.`, type: 'error' });
         return;
      }
    }
    const { error } = await supabase.from('tables').update({ is_active: !table.is_active }).eq('id', table.id);
    if (!error) setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: !t.is_active } : t));
  }

  async function handleDeleteTable(table: TableDB) {
    if (!window.confirm(`Hapus meja ${table.name}?`)) return;
    const { error } = await supabase.from('tables').delete().eq('id', table.id);
    if (!error) {
      setTables(prev => prev.filter(t => t.id !== table.id));
      setSelectedIds(prev => prev.filter(id => id !== table.id));
    }
  }

  async function handleSaveEdit() {
    if (!editingTable || !editName.trim()) return;
    const { error } = await supabase.from('tables').update({ name: editName.trim() }).eq('id', editingTable.id);
    if (!error) {
      setTables(prev => prev.map(t => t.id === editingTable.id ? { ...t, name: editName.trim() } : t));
      setEditingTable(null);
    }
  }

  async function handleDownloadPNGs(scope: 'selected' | 'all') {
    const listToDownload = scope === 'all' ? tables : tables.filter(t => selectedIds.includes(t.id));
    if (listToDownload.length === 0) return;
    setGenerating(true);
    setShowPrintModal(false);
    for (let i = 0; i < listToDownload.length; i++) {
      await downloadSinglePNG(listToDownload[i], selectedTemplate, shopName, appDomain);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setGenerating(false);
  }

  function handlePrint(scope: 'selected' | 'all') {
    setPrintScope(scope);
    setShowPrintModal(false);
    setTimeout(() => setIsPrinting(true), 500);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {alertMsg && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-slate-900/10 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 rounded-xl p-4 max-w-sm flex gap-3 animate-in fade-in slide-in-from-top-4 print:hidden">
          <div className="mt-0.5">{alertMsg.type === 'error' ? '❌' : '✅'}</div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">{alertMsg.title}</h4>
            <p className="text-xs text-slate-900/60 mt-1">{alertMsg.message}</p>
            <button onClick={() => setAlertMsg(null)} className="text-[10px] uppercase font-bold text-blue-500 mt-2 hover:text-blue-600">Tutup</button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="border-b border-slate-900/10 px-6 py-4 flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900">QR Code Generator</h2>
          <p className="text-xs text-slate-900/40 mt-0.5 flex gap-2">
            <span>{selectedIds.length} dicetak</span>
            <span>&bull;</span>
            <span>{tables.filter(t => t.is_active).length} meja aktif (Kuota: {maxTables})</span>
          </p>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all"
          >
            🖨️ Cetak QR
          </button>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-slate-900 text-white rounded-xl p-5 mb-6 print:hidden">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0"><AlertIcon className="w-8 h-8 text-amber-600" /></div>
            <div>
              <h2 className="font-semibold text-base mb-1">QR Code Unik & Statis</h2>
              <p className="text-white/60 text-sm leading-relaxed">Setiap meja memiliki UUID token permanen (statis) di database. QR Code yang dicetak menggunakan token ini.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-900/8 rounded-xl p-6 mb-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Pilih Meja untuk Dicetak</h2>
              <p className="text-xs text-slate-900/40 mt-0.5">Semua data dimuat langsung dari Supabase.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setSelectedIds(tables.map(t => t.id))} className="px-3 py-1.5 border border-slate-900/20 rounded-lg text-slate-900/60 hover:bg-slate-900/5">Pilih Semua</button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 border border-slate-900/20 rounded-lg text-slate-900/60 hover:bg-slate-900/5">Hapus Semua</button>
            </div>
          </div>
          {loading ? (
            <div className="h-10 bg-slate-50 rounded-xl animate-pulse" />
          ) : tables.length === 0 ? (
            <p className="text-sm text-slate-900/40">Belum ada meja. Silakan tambah di bawah.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTable(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                    selectedIds.includes(t.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-900/50 border-transparent hover:border-slate-900/20'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <QRTableList 
          tables={tables} maxTables={maxTables} addingMode={addingMode} setAddingMode={setAddingMode}
          newTableName={newTableName} setNewTableName={setNewTableName} bulkPrefix={bulkPrefix} setBulkPrefix={setBulkPrefix}
          bulkQuantity={bulkQuantity} setBulkQuantity={setBulkQuantity} handleAddTable={handleAddTable} handleAddBulkTables={handleAddBulkTables}
          generating={generating} handleToggleTableActive={handleToggleTableActive} handleDeleteTable={handleDeleteTable}
          editingTable={editingTable} setEditingTable={setEditingTable} editName={editName} setEditName={setEditName} handleSaveEdit={handleSaveEdit}
        />
      </main>

      {/* PRINT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPrintModal(false)} />
          <div className="relative bg-slate-50 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex flex-col md:flex-row">
            {/* Left Sidebar (Settings) */}
            <div className="w-full md:w-1/2 p-6 md:p-8 bg-white md:rounded-l-3xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Cetak / Download</h2>
              <p className="text-sm text-slate-900/50 mb-6">Pilih template dan cara mencetak QR Code.</p>
              
              <div className="space-y-3 mb-8">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900/40">Pilih Template Desain</label>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id as any)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        selectedTemplate === tpl.id ? 'border-slate-900 bg-slate-900/5' : 'border-transparent bg-slate-50 hover:border-slate-900/20'
                      }`}
                    >
                      <div className="text-xl mb-1">{tpl.emoji}</div>
                      <h4 className="font-bold text-sm text-slate-900">{tpl.name}</h4>
                      <p className="text-[10px] text-slate-900/50 mt-1 leading-tight">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900/40">Opsi Eksekusi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handlePrint('selected')} className="p-4 rounded-xl bg-white border border-slate-900/10 hover:border-slate-900 transition-all text-left group">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600">🖨️ Print Pilihan</h4>
                    <p className="text-[10px] text-slate-900/50 mt-1">Hanya {selectedIds.length} meja terpilih</p>
                  </button>
                  <button onClick={() => handleDownloadPNGs('selected')} className="p-4 rounded-xl bg-slate-900 text-white hover:bg-[#333] transition-all text-left">
                    <h4 className="font-bold text-sm">📥 Download PNG</h4>
                    <p className="text-[10px] text-white/50 mt-1">{selectedIds.length} gambar (.png)</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar (Preview) */}
            <div className="w-full md:w-1/2 p-6 md:p-8 bg-slate-50 flex flex-col justify-center items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-900/40 mb-4 self-start">Live Preview</label>
              <div className="w-full max-w-[280px] transform scale-90 md:scale-100 origin-top pointer-events-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 rounded-xl">
                {tables.length > 0 ? (
                   <QRTemplateCard templateId={selectedTemplate} table={tables[0]} shopName={shopName} appDomain={appDomain} />
                ) : (
                   <div className="h-[360px] w-full bg-white/50 rounded-xl flex items-center justify-center text-slate-900/30 font-semibold">Tidak ada meja</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AREA PRINT ONLY */}
      <div className="hidden print:block print:w-full print:bg-white bg-white w-full h-full">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-4 print:gap-4 justify-items-center w-full max-w-full mx-auto" style={{ pageBreakInside: 'avoid' }}>
          {(printScope === 'all' ? tables : tables.filter(t => selectedIds.includes(t.id))).map((t, idx) => (
            <div key={t.id} className="w-full flex justify-center break-inside-avoid print:break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
               <QRTemplateCard templateId={selectedTemplate} table={t} shopName={shopName} appDomain={appDomain} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
