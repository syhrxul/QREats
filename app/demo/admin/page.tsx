'use client';

import { useState } from 'react';
import Link from 'next/link';
import MenusTab from './MenusTab';
import OrdersTab from './OrdersTab';
import AnalyticsTab from './AnalyticsTab';
import QRGeneratorTab from './QRGeneratorTab';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description: string | null;
}

const DUMMY_MENUS: MenuItem[] = [
  { id: 'dm-1', name: 'Nasi Goreng Spesial', price: 25000, image_url: null, is_available: true, description: 'Nasi goreng dengan telur, ayam suwir & kerupuk' },
  { id: 'dm-2', name: 'Es Kopi Susu', price: 18000, image_url: null, is_available: true, description: 'Kopi susu gula aren segar' },
  { id: 'dm-3', name: 'Mie Ayam Bakso', price: 20000, image_url: null, is_available: true, description: 'Mie ayam dengan bakso urat jumbo' },
  { id: 'dm-4', name: 'Ayam Geprek', price: 22000, image_url: null, is_available: false, description: 'Ayam goreng tepung dengan sambal geprek' },
  { id: 'dm-5', name: 'Es Teh Manis', price: 8000, image_url: null, is_available: true, description: 'Teh manis dingin' },
  { id: 'dm-6', name: 'Kentang Goreng', price: 15000, image_url: null, is_available: true, description: 'French fries crispy' },
  { id: 'dm-7', name: 'Steak Chicken', price: 35000, image_url: null, is_available: true, description: 'Chicken steak dengan saus mushroom' },
  { id: 'dm-8', name: 'Roti Bakar Coklat', price: 10000, image_url: null, is_available: true, description: 'Roti bakar isi selai coklat' },
  { id: 'dm-9', name: 'Pisang Goreng Keju', price: 12000, image_url: null, is_available: true, description: 'Pisang goreng crispy dengan keju' },
];

type ActiveTab = 'menus' | 'orders' | 'analytics' | 'qr';

/**
 * Halaman utama Portal Admin Demo (data dummy).
 * File ini kurang dari 200 baris dengan memisahkan panel tab sebagai sub-komponen.
 */
export default function DemoAdminPage() {
  const [menus, setMenus] = useState<MenuItem[]>(DUMMY_MENUS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('menus');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  function handleToggleAvailability(id: string) {
    setMenus((prev) => prev.map((m) => m.id === id ? { ...m, is_available: !m.is_available } : m));
  }

  const navItems = [
    { id: 'menus' as const, name: 'Kelola Menu', badge: menus.length },
    { id: 'orders' as const, name: 'Antrean Kasir', badge: 3 },
    { id: 'analytics' as const, name: 'Analisis', badge: null },
    { id: 'qr' as const, name: 'QR Generator', badge: null },
  ];

  const dummyOrders = [
    { table: 'Meja 3', customer: 'Andi', items: '2x Es Kopi, 1x Nasi Goreng', total: 67000, status: 'pending' },
    { table: 'Meja 7', customer: 'Sari', items: '1x Mie Ayam, 2x Es Teh', total: 45000, status: 'pending' },
    { table: 'Meja 1', customer: 'Budi', items: '1x Ayam Geprek, 2x Es Jeruk', total: 38000, status: 'paid' }
  ];

  const stats = [
    { label: 'Pesanan Hari Ini', value: '27', color: 'text-slate-900' },
    { label: 'Pesanan Pending', value: '3', color: 'text-amber-600' },
    { label: 'Pesanan Selesai', value: '24', color: 'text-emerald-600' },
    { label: 'Menu Aktif', value: String(menus.filter(m => m.is_available).length), color: 'text-blue-600' }
  ];

  const bestSellers = [
    { name: 'Nasi Goreng Spesial', count: 8, percent: 100 },
    { name: 'Es Kopi Susu', count: 6, percent: 75 },
    { name: 'Mie Ayam Bakso', count: 5, percent: 62 },
    { name: 'Kentang Goreng', count: 4, percent: 50 },
    { name: 'Es Teh Manis', count: 3, percent: 37 }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div>
            <span className="font-bold text-base tracking-tight block">Kafe Demo</span>
            <span className="text-[10px] text-white/40 font-semibold tracking-wider uppercase">Portal Admin</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === item.id ? 'bg-white text-slate-900' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <span>{item.name}</span>
              {item.badge !== null && (<span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === item.id ? 'bg-slate-900 text-white' : 'bg-amber-500 text-slate-900'}`}>{item.badge}</span>)}
            </button>
          ))}
        </nav>
        <div className="mx-4 mb-4 p-3 bg-indigo-600/20 border border-orange-400/30 rounded-xl text-xs">
          <p className="text-[10px] text-orange-300 uppercase tracking-wider font-bold">Mode Demo</p>
          <p className="text-white/70 mt-1">Semua data bersifat simulasi.</p>
        </div>
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="mb-3 px-2">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Pengguna</p>
            <p className="text-sm font-bold text-white truncate mt-0.5 font-mono">admin@demo.qreats.id</p>
          </div>
          <Link href="/" className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/20 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/5 active:scale-[0.98] transition-all">Kembali ke Beranda</Link>
        </div>
      </aside>

      {/* Main Panel Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between z-40">
          <span className="font-bold text-base tracking-tight">Kafe Demo</span>
          <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/25 active:scale-95 transition-all text-xs font-bold">
            {isMobileOpen ? 'Tutup' : 'Menu'}
          </button>
        </header>

        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex flex-col bg-slate-900 pt-16 text-white">
            <nav className="flex-1 px-6 py-8 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileOpen(false); }} className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-base font-bold transition-all ${activeTab === item.id ? 'bg-white text-slate-900' : 'text-white/60 hover:bg-white/10'}`}>
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>
            <div className="p-6 border-t border-white/10">
              <Link href="/" className="w-full flex items-center justify-center gap-2 px-5 py-4 border border-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/10 active:scale-95 transition-all">Kembali ke Beranda</Link>
            </div>
          </div>
        )}

        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-xs">MODE DEMO - Dashboard Admin</p>
            <p className="text-[10px] text-white/80">Semua data simulasi. Perubahan tidak tersimpan.</p>
          </div>
          <Link href="/" className="hidden sm:block bg-white text-indigo-600 hover:bg-white/90 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow">Kembali</Link>
        </div>

        {/* Banner Pesanan Terlambat (Escalation Demo) */}
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 font-sans animate-fade-in">
          <div>
            <p className="font-bold text-sm text-rose-800">Ada 2 Pesanan Pending Belum Diproses Kasir (&gt; 5 Menit)! [MODE DEMO]</p>
            <p className="text-xs text-rose-600 mt-1">Meja terpengaruh: <span className="font-bold">Meja 5 (Teh Tarik, Nasi Uduk) &amp; Meja 7 (Mie Ayam Bakso, Es Teh Manis)</span>.</p>
          </div>
          <button onClick={() => setActiveTab('orders')} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow flex-shrink-0 text-center cursor-pointer">
            Buka Antrean Kasir
          </button>
        </div>

        {/* Render Tab Panel */}
        <div className="flex-1 overflow-y-auto min-w-0 bg-slate-50">
          {activeTab === 'menus' && <MenusTab menus={menus} onToggleAvailability={handleToggleAvailability} />}
          {activeTab === 'orders' && <OrdersTab orders={dummyOrders} />}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats} bestSellers={bestSellers} />}
          {activeTab === 'qr' && <QRGeneratorTab tables={[1, 2, 3, 4, 5, 6, 7, 8]} />}
        </div>
      </div>
    </div>
  );
}
