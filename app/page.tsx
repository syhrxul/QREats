'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [statCounter, setStatCounter] = useState({ orders: 0, merchants: 0, tables: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setLoading(false);
    });
  }, []);

  // Animated counter effect
  useEffect(() => {
    const targets = { orders: 12480, merchants: 345, tables: 2190 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setStatCounter({
        orders: Math.round(targets.orders * ease),
        merchants: Math.round(targets.merchants * ease),
        tables: Math.round(targets.tables * ease),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F2EB] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white flex flex-col">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-[#1A1A1A]">QREats</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDemoModal(true)} className="px-4 py-2 text-xs font-bold text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            Lihat Demo
          </button>
          {loading ? null : hasSession ? (
            <Link href="/dashboard/menus" className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-all">Masuk Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-xs font-bold text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-all">Masuk Staf</Link>
              <Link href="/register" className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-all shadow-sm">Daftar Toko</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl w-full mx-auto px-6 py-12 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-12 items-center flex-grow">
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A1A]/5 rounded-full text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wider">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Sistem Self-Order &amp; Kasir Real-Time
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A1A1A] leading-[1.1] font-sans">
            Kelola Menu &amp; Order Resto Lewat <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Satu QR Code.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#1A1A1A]/60 leading-relaxed max-w-xl font-medium">
            Pelanggan scan, pilih menu, bayar — kasir terima notifikasi instan. Semua pesanan terpantau real-time dari dashboard tanpa perlu aplikasi tambahan.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            {hasSession ? (
              <Link href="/dashboard/menus" className="px-8 py-4 bg-[#1A1A1A] text-white font-bold text-sm rounded-2xl hover:bg-[#333] active:scale-[0.98] transition-all shadow-md flex items-center gap-2">Ke Dashboard Utama ➜</Link>
            ) : (
              <>
                <Link href="/register" className="px-8 py-4 bg-[#1A1A1A] text-white font-bold text-sm rounded-2xl hover:bg-[#333] active:scale-[0.98] transition-all shadow-md">Daftar Toko Gratis</Link>
                <button onClick={() => setShowDemoModal(true)} className="px-8 py-4 border-2 border-orange-300 text-orange-600 font-bold text-sm rounded-2xl hover:bg-orange-50 active:scale-[0.98] transition-all flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Coba Demo Langsung
                </button>
              </>
            )}
          </div>
        </div>
        <div className="md:col-span-5 relative flex justify-center">
          <div className="absolute w-72 h-72 bg-gradient-to-r from-orange-300 to-amber-300 rounded-full blur-3xl opacity-30 -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="bg-white border border-[#1A1A1A]/10 rounded-3xl p-6 shadow-xl w-full max-w-sm space-y-5 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-[#1A1A1A]/60">Sistem Online</span>
              </div>
              <span className="text-xs font-black bg-[#1A1A1A] text-white px-2.5 py-1 rounded-lg">DEMO</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 bg-[#F5F2EB]/60 rounded-2xl border border-[#1A1A1A]/5">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" className="opacity-80">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="16" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="16" width="6" height="6" rx="1" />
                <rect x="16" y="16" width="6" height="6" rx="1" />
                <path d="M10 5h4M5 10v4M10 10h4M14 14v4M19 10v4" />
              </svg>
              <p className="text-[10px] font-bold text-[#1A1A1A]/40 mt-4 tracking-widest uppercase">Pindai Meja Pelanggan</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-[#F5F2EB]/60 border border-[#1A1A1A]/5 rounded-xl text-center">
                <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase">Antrean</p>
                <p className="text-sm font-bold text-orange-600 mt-0.5">4</p>
              </div>
              <div className="p-2.5 bg-[#F5F2EB]/60 border border-[#1A1A1A]/5 rounded-xl text-center">
                <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase">Selesai</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">23</p>
              </div>
              <div className="p-2.5 bg-[#F5F2EB]/60 border border-[#1A1A1A]/5 rounded-xl text-center">
                <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase">Menu</p>
                <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">18</p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[11px] text-emerald-700 font-semibold">Meja 5 — 2x Es Kopi, 1x Nasi Goreng</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="bg-[#1A1A1A] py-10">
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-black text-white">{statCounter.orders.toLocaleString('id-ID')}+</p>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">Pesanan Diproses</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-white">{statCounter.merchants}+</p>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">Merchant Terdaftar</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-white">{statCounter.tables.toLocaleString('id-ID')}+</p>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">Meja Terhubung</p>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="bg-white border-t border-[#1A1A1A]/5 py-16">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">Kenapa Harus QREats?</h2>
            <p className="text-sm text-[#1A1A1A]/50 mt-2 max-w-lg mx-auto">Sistem all-in-one untuk mengelola restoran modern — dari pemesanan mandiri hingga analisis bisnis.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                  </svg>
                ),
                title: 'QR Self-Order',
                desc: 'Pelanggan scan QR di meja -> pilih menu -> langsung pesan. Tanpa install aplikasi.',
                bg: 'bg-orange-100'
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ),
                title: 'Notifikasi Real-Time',
                desc: 'Kasir langsung dapat notifikasi saat ada pesanan baru masuk. Tidak perlu refresh halaman.',
                bg: 'bg-emerald-100'
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                title: 'Verifikasi Pembayaran',
                desc: 'Kasir bisa verifikasi bukti transfer langsung dari dashboard — lunas atau tolak dalam satu klik.',
                bg: 'bg-blue-100'
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: 'Dashboard Analisis',
                desc: 'Pantau menu terlaris, pesanan per hari, & status meja — semua diupdate secara real-time.',
                bg: 'bg-violet-100'
              },
            ].map((f, i) => (
              <div key={i} className="bg-[#F5F2EB]/50 border border-[#1A1A1A]/5 rounded-2xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>{f.icon}</div>
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-1.5">{f.title}</h3>
                <p className="text-xs text-[#1A1A1A]/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-[#F5F2EB]">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">Cara Kerja</h2>
            <p className="text-sm text-[#1A1A1A]/50 mt-2">3 langkah simpel untuk memulai</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Daftar & Upload Menu', desc: 'Daftarkan toko Anda, tambahkan menu beserta harga dan foto. Siap dalam hitungan menit.' },
              { num: '2', title: 'Cetak QR untuk Meja', desc: 'Generate QR code unik untuk setiap meja. Pelanggan scan langsung dari HP mereka.' },
              { num: '3', title: 'Terima & Proses Pesanan', desc: 'Pesanan masuk real-time ke dashboard kasir. Verifikasi pembayaran, tandai siap saji.' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-lg">{s.num}</div>
                <h3 className="font-bold text-[#1A1A1A] mb-2">{s.title}</h3>
                <p className="text-sm text-[#1A1A1A]/50">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A1A1A] py-16">
        <div className="max-w-7xl w-full mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Mulai Kelola Restoran Anda Sekarang</h2>
          <p className="text-sm text-white/50 mb-8 max-w-md mx-auto">Gratis untuk dicoba. Tidak perlu kartu kredit. Setup dalam 5 menit.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="px-8 py-4 bg-white text-[#1A1A1A] font-bold text-sm rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-md">Daftar Toko Gratis ➜</Link>
            <button onClick={() => setShowDemoModal(true)} className="px-8 py-4 border-2 border-white/20 text-white font-bold text-sm rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Coba Demo
            </button>
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDemoModal(false)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <button onClick={() => setShowDemoModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/20 transition-colors text-sm">✕</button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-[#1A1A1A]">Pilih Mode Demo</h3>
              <p className="text-sm text-[#1A1A1A]/50 mt-1">Coba langsung tanpa perlu login — semua data adalah simulasi.</p>
            </div>
            <div className="space-y-3">
              <Link href="/demo/kasir" onClick={() => setShowDemoModal(false)} className="flex items-center gap-4 p-5 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-2xl hover:shadow-md hover:border-orange-300 transition-all group">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] text-sm">Dashboard Kasir</h4>
                  <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Lihat antrean pesanan, verifikasi pembayaran, tandai pesanan siap.</p>
                </div>
                <svg className="w-5 h-5 text-[#1A1A1A]/30 flex-shrink-0 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/demo/admin" onClick={() => setShowDemoModal(false)} className="flex items-center gap-4 p-5 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-2xl hover:shadow-md hover:border-orange-300 transition-all group">
                <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] text-sm">Dashboard Admin</h4>
                  <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Kelola menu, lihat analisis pesanan, atur QR meja &amp; karyawan.</p>
                </div>
                <svg className="w-5 h-5 text-[#1A1A1A]/30 flex-shrink-0 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <p className="text-[10px] text-[#1A1A1A]/30 text-center mt-5">Semua data dalam mode demo adalah simulasi dan tidak akan tersimpan.</p>
          </div>
        </div>
      )}
    </main>
  );
}