'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';

interface ShopDB {
  id: string;
  name: string;
  is_active: boolean;
  trial_ends_at: string;
  created_at: string;
  owner_id: string;
  employeeCount?: number;
  subscription_tier?: string;
  addon_tables?: number;
  addon_cashiers?: number;
  upgrade_request?: boolean;
  upgrade_reason?: string;
}

import { Crown } from 'lucide-react';
import { LockIcon, EyeIcon, ShieldIcon, RefreshIcon, AlertIcon } from '../../../components/Icons';

export default function SuperadminShopsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shops, setShops] = useState<ShopDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Shop Detail States
  const [selectedShop, setSelectedShop] = useState<ShopDB | null>(null);
  const [shopStats, setShopStats] = useState({
    menuCount: 0,
    employeeCount: 0,
    tableCount: 0,
    orderCount: 0,
    loading: false,
  });

  // Limits Editing States
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [editTier, setEditTier] = useState('basic');
  const [editAddonTables, setEditAddonTables] = useState(0);
  const [editAddonCashiers, setEditAddonCashiers] = useState(0);
  const [savingLimits, setSavingLimits] = useState(false);

  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [addDaysInput, setAddDaysInput] = useState(30);
  const [alertMsg, setAlertMsg] = useState<{title: string, message: string, type: 'success'|'error'} | null>(null);

  async function handleToggleFreeze() {
    if (!selectedShop) return;
    setIsProcessingAction(true);
    try {
      const newStatus = !selectedShop.is_active;
      const { error } = await supabase.from('shops').update({ is_active: newStatus }).eq('id', selectedShop.id);
      if (error) throw error;
      setSelectedShop({ ...selectedShop, is_active: newStatus });
      fetchShops();
      setAlertMsg({ title: 'Berhasil', message: newStatus ? 'Toko berhasil diaktifkan.' : 'Toko berhasil dibekukan.', type: 'success' });
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: 'Error: ' + e.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function handleAddLicenseDays() {
    if (!selectedShop) return;
    setIsProcessingAction(true);
    try {
      const currentExpiry = new Date(selectedShop.trial_ends_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + addDaysInput * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('shops').update({ trial_ends_at: newExpiry, is_active: true }).eq('id', selectedShop.id);
      if (error) throw error;
      setSelectedShop({ ...selectedShop, trial_ends_at: newExpiry, is_active: true });
      fetchShops();
      setAlertMsg({ title: 'Berhasil', message: `Lisensi diperpanjang ${addDaysInput} hari.`, type: 'success' });
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: 'Error: ' + e.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function handleApprovePro() {
    if (!selectedShop) return;
    setIsProcessingAction(true);
    try {
      const { error } = await supabase.from('shops').update({ 
        subscription_tier: 'pro',
        upgrade_request: false,
        upgrade_reason: null,
        base_table_limit: 9999,
        base_cashier_limit: 9999
      }).eq('id', selectedShop.id);
      
      if (error) throw error;
      
      setAlertMsg({ title: 'Berhasil', message: 'Toko berhasil di-upgrade ke Paket Pro!', type: 'success' });
      setSelectedShop({ ...selectedShop, subscription_tier: 'pro', upgrade_request: false, upgrade_reason: undefined });
      fetchShops();
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: 'Error: ' + e.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function handleOpenShopDetail(shop: ShopDB) {
    setSelectedShop(shop);
    setIsEditingLimits(false);
    setEditTier(shop.subscription_tier || 'basic');
    setEditAddonTables(shop.addon_tables || 0);
    setEditAddonCashiers(shop.addon_cashiers || 0);
    
    setShopStats((prev) => ({ ...prev, loading: true }));
    try {
      const { count: menuCount } = await supabase
        .from('menus')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      const { count: employeeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .neq('role', 'owner')
        .neq('role', 'superadmin');

      const { count: tableCount } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      setShopStats({
        menuCount: menuCount ?? 0,
        employeeCount: employeeCount ?? 0,
        tableCount: tableCount ?? 0,
        orderCount: orderCount ?? 0,
        loading: false,
      });
    } catch (e) {
      console.error(e);
      setShopStats((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleSaveLimits() {
    if (!selectedShop) return;
    setSavingLimits(true);
    try {
      const updateData = {
        subscription_tier: editTier,
        base_table_limit: editTier === 'pro' ? 9999 : 20,
        base_cashier_limit: editTier === 'pro' ? 9999 : 1,
        addon_tables: editAddonTables,
        addon_cashiers: editAddonCashiers,
      };

      const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', selectedShop.id);

      if (error) throw error;
      
      setAlertMsg({ title: 'Berhasil', message: 'Limit & Tier berhasil diperbarui!', type: 'success' });
      setIsEditingLimits(false);
      setSelectedShop({ ...selectedShop, ...updateData });
      fetchShops(); // Refresh the list
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: 'Gagal menyimpan limit: ' + e.message, type: 'error' });
    } finally {
      setSavingLimits(false);
    }
  }

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profile || profile.role !== 'superadmin') {
        setAccessDenied(true);
      }
      setAuthChecking(false);
    }
    checkAccess();
  }, []);

  // ─── Fetch Shops & Employee Counts ─────────────────────────────────────────

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;

      const loadedShops: ShopDB[] = shopsData ?? [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('shop_id, role');

      const employeeMap: { [shopId: string]: number } = {};
      (profiles ?? []).forEach((p) => {
        if (p.shop_id && p.role !== 'owner') {
          employeeMap[p.shop_id] = (employeeMap[p.shop_id] || 0) + 1;
        }
      });

      const shopsWithEmp = loadedShops.map((s) => ({
        ...s,
        employeeCount: employeeMap[s.id] || 0,
      }));

      setShops(shopsWithEmp);
    } catch (e) {
      console.error('Error fetching shops:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && !accessDenied) {
      fetchShops();
    }
  }, [authChecking, accessDenied]);

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-sm text-slate-900/60">Memeriksa hak akses superadmin...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="block mb-4"><LockIcon className="w-12 h-12 text-slate-900 mx-auto" /></span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-slate-900/70">Halaman ini khusus untuk Superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      
      {/* Custom Alert Modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAlertMsg(null)} />
          <div className="relative bg-[#F9F6EE] rounded-xl overflow-hidden max-w-sm w-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 p-6 text-center border border-slate-900/10 animate-fade-in-up">
            <div className={`w-16 h-16 rounded-xl mx-auto flex items-center justify-center mb-4 ${alertMsg.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
               <AlertIcon className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{alertMsg.title}</h3>
            <p className="text-sm text-slate-900/60 leading-relaxed mb-6">{alertMsg.message}</p>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-[#333] transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-900/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kelola Merchant Toko</h2>
          <p className="text-xs text-slate-900/60 mt-0.5">Daftar toko merchant, masa aktif lisensi, staf karyawan terdaftar</p>
        </div>
        <button
          onClick={fetchShops}
          className="px-4 py-2 border border-slate-900/20 bg-white text-slate-900 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
        >
          <RefreshIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Table Card */}
        <div className="bg-white border border-slate-900/8 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Toko Terdaftar</h3>
              <p className="text-xs text-slate-900/60 mt-0.5">Pantau status & intip dashboard menu kasir toko</p>
            </div>
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {shops.length} Toko
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-50/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <p className="text-xs text-center py-12 text-slate-900/60">Belum ada toko yang terdaftar.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-900/5 text-slate-900/60 font-bold">
                    <th className="p-3">Nama Toko</th>
                    <th className="p-3">ID Toko</th>
                    <th className="p-3 text-center">Staf Karyawan</th>
                    <th className="p-3">Masa Berlaku</th>
                    <th className="p-3 text-center">Monitor</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((s) => {
                    const isTrialActive = new Date(s.trial_ends_at) > new Date();
                    const daysLeft = Math.ceil((new Date(s.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = isTrialActive && daysLeft <= 2 && daysLeft >= 0;
                    
                    return (
                      <tr 
                        key={s.id} 
                        className="border-b border-slate-900/5 last:border-b-0 hover:bg-slate-50/10 transition-colors cursor-pointer"
                        onClick={() => handleOpenShopDetail(s)}
                      >
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          {s.name}
                          {s.upgrade_request && (
                            <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold" title={s.upgrade_reason || ''}>
                              <Crown className="w-3 h-3" /> PRO REQ
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-900/60 text-[10px]">
                          {s.id}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-900">
                          {s.employeeCount} Staf
                        </td>
                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-2">
                            <span className={
                              !isTrialActive ? 'text-red-500' 
                              : isExpiringSoon ? 'text-amber-500' 
                              : 'text-emerald-600'
                            }>
                              {new Date(s.trial_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {isExpiringSoon && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {daysLeft === 0 ? 'Hari Ini' : `H-${daysLeft}`}
                              </span>
                            )}
                            {!isTrialActive && (
                              <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                HABIS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShopDetail(s);
                            }}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-[#333] active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 mx-auto"
                          >
                            <EyeIcon className="w-4 h-4" /> Intip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
      {/* Modal Detail Toko */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedShop(null)} />
          <div className="relative bg-[#F9F6EE] rounded-xl overflow-hidden max-w-md w-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 border border-slate-900/10 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900/10 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg font-sans">Detail Merchant Toko</h3>
                <p className="text-xs text-slate-900/60 font-mono mt-0.5">ID: {selectedShop.id}</p>
              </div>
              <button onClick={() => setSelectedShop(null)} className="text-xl text-slate-900/60 hover:text-slate-900 cursor-pointer">
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-900/5">
                <div>
                  <span className="text-[10px] font-bold text-slate-900/60 uppercase tracking-wide">Nama Toko</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedShop.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-900/60 uppercase tracking-wide">Status Lisensi</span>
                  <p className="mt-0.5">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      new Date(selectedShop.trial_ends_at) > new Date()
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {new Date(selectedShop.trial_ends_at) > new Date() ? 'AKTIF' : 'EXPIRED'}
                    </span>
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ml-1 ${
                      selectedShop.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-300'
                    }`}>
                      {selectedShop.is_active ? 'NORMAL' : 'DIBEKUKAN'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-900/60 uppercase tracking-wide">Statistik Operasional</span>
                {shopStats.loading ? (
                  <p className="text-xs text-slate-900/60 animate-pulse py-2">Memuat statistik toko...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 uppercase tracking-wide font-sans">Jumlah Menu</span>
                      <p className="text-xl font-bold text-slate-900 mt-1">{shopStats.menuCount} Item</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 uppercase tracking-wide font-sans">Jumlah Karyawan</span>
                      <p className="text-xl font-bold text-slate-900 mt-1">{shopStats.employeeCount} Staf</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 uppercase tracking-wide font-sans">Jumlah Meja</span>
                      <p className="text-xl font-bold text-slate-900 mt-1">{shopStats.tableCount} Meja</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 uppercase tracking-wide font-sans">Total Orderan</span>
                      <p className="text-xl font-bold text-slate-900 mt-1">{shopStats.orderCount} Order</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upgrade Request Panel */}
              {selectedShop.upgrade_request && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pengajuan Upgrade Pro</span>
                  </div>
                  <div className="bg-white/60 p-3 rounded-xl border border-amber-100 text-sm text-amber-900 italic">
                    "{selectedShop.upgrade_reason}"
                  </div>
                  <button
                    onClick={handleApprovePro}
                    disabled={isProcessingAction}
                    className="w-full py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    Setujui & Jadikan Paket Pro
                  </button>
                </div>
              )}

              {/* Superadmin Actions */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-900/5 space-y-3">
                <span className="text-[10px] font-bold text-slate-900/60 uppercase tracking-wide">Tindakan Superadmin</span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={addDaysInput}
                      onChange={(e) => setAddDaysInput(Number(e.target.value))}
                      className="w-20 px-3 py-2 rounded-lg border border-slate-900/10 text-xs font-bold text-center text-slate-900 bg-white"
                    />
                    <button
                      onClick={handleAddLicenseDays}
                      disabled={isProcessingAction}
                      className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      Perpanjang Lisensi (Hari)
                    </button>
                  </div>
                  <button
                    onClick={handleToggleFreeze}
                    disabled={isProcessingAction}
                    className={`w-full py-2 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${selectedShop.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-[#333]'}`}
                  >
                    {selectedShop.is_active ? 'Bekukan Toko' : 'Aktifkan Toko'}
                  </button>
                </div>
              </div>

              {/* Edit Limits & Add-ons */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-900/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-900/60 uppercase tracking-wide">Pengaturan Paket & Kuota</span>
                  <button 
                    onClick={() => setIsEditingLimits(!isEditingLimits)}
                    className="text-[10px] font-bold text-slate-900 hover:underline"
                  >
                    {isEditingLimits ? 'Batal Edit' : 'Edit Kuota'}
                  </button>
                </div>
                
                {isEditingLimits ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold block mb-1">Paket Berlangganan</label>
                      <select 
                        value={editTier}
                        onChange={(e) => setEditTier(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-900/10 text-xs text-slate-900 bg-white"
                      >
                        <option value="basic">Basic (Max 10 Meja, 1 Kasir)</option>
                        <option value="pro">Pro (Unlimited)</option>
                      </select>
                    </div>
                    {editTier === 'basic' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold block mb-1">Ekstra Add-on Meja</label>
                          <input 
                            type="number" 
                            min="0"
                            value={editAddonTables}
                            onChange={(e) => setEditAddonTables(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-900/10 text-xs text-slate-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold block mb-1">Ekstra Add-on Kasir</label>
                          <input 
                            type="number" 
                            min="0"
                            value={editAddonCashiers}
                            onChange={(e) => setEditAddonCashiers(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-900/10 text-xs text-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleSaveLimits}
                      disabled={savingLimits}
                      className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-[#333] transition-all"
                    >
                      {savingLimits ? 'Menyimpan...' : 'Simpan Perubahan Kuota'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 block capitalize">{selectedShop.subscription_tier || 'basic'}</span>
                      <span className="text-xs font-bold">Paket</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 block">+ {selectedShop.addon_tables || 0}</span>
                      <span className="text-xs font-bold">Addon Meja</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-900/5 text-center">
                      <span className="text-[9px] font-bold text-slate-900/60 block">+ {selectedShop.addon_cashiers || 0}</span>
                      <span className="text-xs font-bold">Addon Kasir</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-[10px] leading-relaxed font-sans flex items-start gap-2">
                <ShieldIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Kebijakan Privasi Tenant:</strong> Untuk menjaga privasi merchant, detail personal karyawan, data pelanggan, dan histori transaksi lengkap disembunyikan. Superadmin hanya dapat memantau akumulasi volume operasional agregat.</span>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedShop(null)}
              className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-all cursor-pointer font-sans"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
