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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Auth state tracking
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  // Muted Neobrutalism classes
  const neoBorder = "border-2 border-slate-900";
  const neoShadow = "shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]";
  const neoShadowLg = "shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]";
  const neoHover = "hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all";
  const neoHoverBtn = "hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white flex flex-col overflow-x-hidden">
      
      {/* Header */}
      <header className={`max-w-7xl w-full mx-auto px-6 py-5 flex justify-between items-center ${neoBorder} bg-white border-x-0 border-t-0 shadow-[0_2px_0_0_rgba(15,23,42,1)] z-10 sticky top-0`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-indigo-600 flex items-center justify-center ${neoBorder} ${neoShadow}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="square">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">QREats</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowDemoModal(true)} className={`hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-bold text-sm ${neoBorder} ${neoShadow} ${neoHoverBtn}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            Demo Interaktif
          </button>
          {loading ? null : hasSession ? (
            <Link href="/dashboard/menus" className={`px-5 py-2 bg-slate-900 text-white font-bold text-sm ${neoBorder} hover:bg-slate-800 transition-colors`}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-block px-4 py-2 font-bold text-sm text-slate-600 hover:text-slate-900 transition-colors">Login Staf</Link>
              <Link href="/register" className={`px-5 py-2 bg-indigo-600 text-white font-bold text-sm ${neoBorder} ${neoShadow} ${neoHoverBtn}`}>Mulai Usaha</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl w-full mx-auto px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-12 gap-16 items-center flex-grow overflow-hidden">
        {/* Decorative elements */}
        <div className={`absolute top-16 left-12 w-20 h-20 bg-indigo-100 rounded-full ${neoBorder} ${neoShadow} -z-10 animate-pulse`}></div>
        <div className={`absolute bottom-24 right-16 w-24 h-24 bg-emerald-100 rotate-12 ${neoBorder} ${neoShadow} -z-10`}></div>
        
        <div className="md:col-span-7 space-y-8 z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 bg-white font-bold text-xs text-slate-700 tracking-wide ${neoBorder} ${neoShadow}`}>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Enterprise-Grade Point of Sale
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-slate-900">
            Sistem Kelola Pesanan Kasir Modern via <span className="bg-indigo-100 px-2 py-1 mx-1 border-2 border-slate-900 inline-block text-indigo-700 -rotate-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">Satu QR Code.</span>
          </h1>
          <p className="text-lg sm:text-xl font-medium leading-relaxed max-w-2xl bg-white p-5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-slate-600">
            Digitalisasi manajemen restoran skala korporat tanpa investasi hardware mahal. Pelanggan memindai, memesan, & membayar secara mandiri.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            {hasSession ? (
              <Link href="/dashboard/menus" className={`px-8 py-4 bg-indigo-600 text-white font-bold text-base ${neoBorder} ${neoShadowLg} ${neoHover} flex items-center gap-2`}>Masuk ke Dashboard ➔</Link>
            ) : (
              <>
                <Link href="/register" className={`px-8 py-4 bg-indigo-600 text-white font-bold text-base ${neoBorder} ${neoShadowLg} ${neoHover} text-center`}>Daftarkan Bisnis Anda</Link>
                <button onClick={() => setShowDemoModal(true)} className={`px-8 py-4 bg-white text-slate-900 font-bold text-base ${neoBorder} ${neoShadowLg} ${neoHover} text-center flex justify-center items-center gap-3`}>
                  Jadwalkan Demo
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Hero Illustration */}
        <div className="md:col-span-5 relative flex justify-center z-10">
          <div className={`bg-white ${neoBorder} ${neoShadowLg} p-6 w-full max-w-sm space-y-6 relative hover:rotate-1 transition-transform duration-500`}>
            
            <div className={`flex flex-col items-center justify-center py-8 bg-slate-50 ${neoBorder} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="white" stroke="#0f172a" strokeWidth="1.5" className="opacity-100">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="16" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="16" width="6" height="6" rx="1" />
                <rect x="16" y="16" width="6" height="6" rx="1" />
                <path d="M10 5h4M5 10v4M10 10h4M14 14v4M19 10v4" />
              </svg>
              <p className="text-xs font-bold mt-4 tracking-wider text-slate-500 uppercase">Self-Order Terminal</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 bg-indigo-50 ${neoBorder} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-center`}>
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500">Antrean Aktif</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">4</p>
              </div>
              <div className={`p-4 bg-emerald-50 ${neoBorder} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-center`}>
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500">Terselesaikan</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">23</p>
              </div>
            </div>
            
            <div className={`bg-white border-2 border-slate-900 p-4 flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}>
              <div className="w-5 h-5 bg-emerald-100 border border-emerald-300 rounded text-emerald-700 flex items-center justify-center text-xs">✓</div>
              <p className="text-xs font-bold text-slate-700">Meja 5 — 2x Es Kopi, 1x Nasi Goreng</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`bg-slate-900 py-16 border-y-2 border-slate-900 relative z-20`}>
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-700 p-8">
          <div className="p-4">
            <p className="text-4xl md:text-5xl font-bold text-white">{statCounter.orders.toLocaleString('id-ID')}+</p>
            <p className="text-sm text-slate-400 font-medium tracking-wide mt-2">Transaksi Terproses</p>
          </div>
          <div className="p-4">
            <p className="text-4xl md:text-5xl font-bold text-white">{statCounter.merchants}+</p>
            <p className="text-sm text-slate-400 font-medium tracking-wide mt-2">Mitra Korporat</p>
          </div>
          <div className="p-4">
            <p className="text-4xl md:text-5xl font-bold text-white">{statCounter.tables.toLocaleString('id-ID')}+</p>
            <p className="text-sm text-slate-400 font-medium tracking-wide mt-2">Titik Meja Terpadu</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-24 relative">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-16 relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Standardisasi Operasional Bisnis</h2>
            <p className="text-base font-medium mt-4 max-w-2xl mx-auto text-slate-600">Skalabilitas tinggi dan terintegrasi penuh untuk mengoptimalkan efisiensi manajemen pelayanan restoran berskala besar.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                  </svg>
                ),
                title: 'QR Self-Order',
                desc: 'Integrasi pesanan langsung dari meja pelanggan tanpa instalasi aplikasi tambahan.',
                bg: 'bg-indigo-50'
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ),
                title: 'Real-Time Sync',
                desc: 'Sinkronisasi instan antrean dapur dan kasir menggunakan infrastruktur cloud.',
                bg: 'bg-emerald-50'
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                title: 'Validasi Pembayaran',
                desc: 'Audit trail dan validasi bukti transaksi digital dalam satu klik terpusat.',
                bg: 'bg-sky-50'
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: 'Analitik Terpadu',
                desc: 'Pemantauan komprehensif atas tren penjualan, perputaran meja, dan performa menu.',
                bg: 'bg-white'
              },
            ].map((f, i) => (
              <div key={i} className={`bg-white ${neoBorder} ${neoShadow} p-8 ${neoHover} transform transition-transform`}>
                <div className={`w-12 h-12 ${f.bg} ${neoBorder} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center mb-6`}>{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white border-t-2 border-slate-900 relative">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Implementasi yang Mudah</h2>
            <p className="text-base font-medium mt-4 text-slate-600 max-w-xl mx-auto">Adaptasi teknologi tanpa hambatan operasional, dirancang untuk diaktifkan hanya dalam 3 langkah konkrit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Konfigurasi Sistem', desc: 'Pengaturan akun master, digitalisasi menu, dan penetapan harga.', color: 'bg-white' },
              { num: '2', title: 'Distribusi QR', desc: 'Pembuatan dan pencetakan titik identifikasi meja (QR) untuk pelanggan.', color: 'bg-indigo-50' },
              { num: '3', title: 'Eksekusi Layanan', desc: 'Penerimaan pesanan otomatis dan pengawasan langsung pada command center.', color: 'bg-emerald-50' },
            ].map((s, i) => (
              <div key={i} className={`text-center flex flex-col items-center bg-white p-8 ${neoBorder} ${neoShadow} hover:-translate-y-1 transition-transform`}>
                <div className={`w-14 h-14 ${s.color} ${neoBorder} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center text-slate-900 text-xl font-bold mb-6`}>{s.num}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50 border-t-2 border-slate-900">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Paket Lisensi</h2>
            <p className="text-base font-medium mt-4 text-slate-600 max-w-xl mx-auto">Dirancang secara skalabel untuk memenuhi kebutuhan bisnis f&b tahap menengah hingga enterprise.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Paket Basic */}
            <div className={`bg-white ${neoBorder} ${neoShadowLg} p-10 flex flex-col hover:-translate-y-1 transition-transform`}>
              <div className="mb-8 border-b-2 border-slate-100 pb-8">
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 border border-slate-200 uppercase tracking-wide">Standard Tier</span>
                <h3 className="text-3xl font-bold text-slate-900 mt-4">Basic</h3>
                <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">Infrastruktur standar untuk kafe atau restoran dengan skala operasional menengah.</p>
              </div>
              <div className="flex-1">
                <ul className="space-y-4 font-medium text-slate-700 text-sm">
                  <li className="flex items-start gap-3"><span className="text-indigo-600">✓</span> Maksimal 20 Akses QR Meja</li>
                  <li className="flex items-start gap-3"><span className="text-indigo-600">✓</span> 1 Lisensi Akun Pengelola</li>
                  <li className="flex items-start gap-3"><span className="text-indigo-600">✓</span> Penerimaan Notifikasi Web</li>
                  <li className="flex items-start gap-3"><span className="text-indigo-600">✓</span> Manajemen Menu Dasar</li>
                </ul>
              </div>
            </div>

            {/* Paket Pro */}
            <div className={`bg-slate-900 text-white ${neoBorder} shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-10 flex flex-col relative hover:-translate-y-1 transition-transform`}>
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                Enterprise Choice
              </div>
              <div className="mb-8 border-b-2 border-slate-800 pb-8">
                <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1 border border-slate-700 uppercase tracking-wide">Advanced Tier</span>
                <h3 className="text-3xl font-bold text-white mt-4">Pro</h3>
                <p className="text-sm font-medium text-slate-400 mt-3 leading-relaxed">Ekosistem tanpa batas untuk jaringan restoran atau pengelolaan volume transaksi tinggi.</p>
              </div>
              <div className="flex-1">
                <ul className="space-y-4 font-medium text-slate-300 text-sm">
                  <li className="flex items-start gap-3"><span className="text-emerald-400 font-bold">∞</span> Kapasitas Akses QR Meja Tanpa Batas</li>
                  <li className="flex items-start gap-3"><span className="text-emerald-400 font-bold">∞</span> Multi-lisensi Akun Kasir & Staf</li>
                  <li className="flex items-start gap-3"><span className="text-indigo-400">✓</span> Seluruh Fitur Standard Tier</li>
                  <li className="flex items-start gap-3"><span className="text-indigo-400">✓</span> Modul Laporan & Analitik Lanjutan</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-24 border-t-2 border-slate-900">
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 sticky top-28 h-fit">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Pusat Informasi</h2>
            <p className="text-base font-medium text-slate-600 leading-relaxed">Basis pengetahuan seputar kapabilitas teknis dan operasional QREats.</p>
          </div>
          <div className="md:col-span-8 space-y-4">
            {[
              {
                q: "Mekanisme operasional QREats?",
                a: "QREats berfungsi sebagai SaaS Cloud POS yang menghubungkan titik temu pelanggan (via QR) secara langsung ke dasbor manajemen pesanan secara seketika tanpa perantara hardware pihak ketiga."
              },
              {
                q: "Persyaratan instalasi pada perangkat pelanggan?",
                a: "Sistem beroperasi 100% secara berbasis web (PWA). Pelanggan tidak diwajibkan untuk mengunduh atau menginstal aplikasi apa pun, mengurangi friksi transaksi."
              },
              {
                q: "Bagaimana proses rekonsiliasi pembayaran?",
                a: "Pelanggan mengunggah slip bukti transfer melalui halaman checkout. Sistem memberikan sinyal pada dasbor kasir untuk validasi akhir dengan satu tindakan konfirmasi manual atau penolakan."
              },
              {
                q: "Tingkat keamanan arsitektur data?",
                a: "Data dienkripsi pada tingkat basis data menggunakan cloud environment dengan kepatuhan standar industri untuk melindungi kerahasiaan pesanan dan kredensial akses."
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className={`bg-white ${neoBorder} transition-all duration-300 ${openFaq === i ? 'shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] bg-slate-50' : 'hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <h3 className={`font-bold text-lg ${openFaq === i ? 'text-indigo-700' : 'text-slate-900'}`}>
                    {faq.q}
                  </h3>
                  <div className={`w-8 h-8 border-2 border-slate-900 flex items-center justify-center font-bold text-lg transition-transform ${openFaq === i ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 text-slate-900'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-200 pt-4">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-24 border-t-2 border-slate-900 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">Digitalisasi Bisnis Anda Hari Ini</h2>
          <p className="text-lg font-medium text-indigo-100 mb-10 max-w-2xl mx-auto">Terapkan ekosistem manajemen pemesanan yang mutakhir dan efisien dalam hitungan menit.</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/register" className={`px-8 py-4 bg-white text-slate-900 font-bold text-sm ${neoBorder} shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all`}>
              Buat Akun Perusahaan
            </Link>
            <button onClick={() => setShowDemoModal(true)} className={`px-8 py-4 bg-indigo-800 text-white font-bold text-sm ${neoBorder} shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all`}>
              Konsultasi & Demo
            </button>
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDemoModal(false)} />
          <div className={`relative bg-white ${neoBorder} shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-8 max-w-lg w-full`}>
            <button onClick={() => setShowDemoModal(false)} className={`absolute -top-4 -right-4 w-10 h-10 bg-white ${neoBorder} flex items-center justify-center font-bold hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}>✕</button>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900">Akses Sandbox Demo</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">Jelajahi fungsionalitas sistem secara langsung melalui ruang lingkup uji coba.</p>
            </div>
            <div className="space-y-4">
              <Link href="/demo/kasir" onClick={() => setShowDemoModal(false)} className={`flex items-center gap-5 p-5 bg-white ${neoBorder} shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${neoHover} group`}>
                <div className={`w-12 h-12 bg-indigo-50 ${neoBorder} flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Terminal Kasir</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">Antrean & verifikasi transaksi.</p>
                </div>
              </Link>
              <Link href="/demo/admin" onClick={() => setShowDemoModal(false)} className={`flex items-center gap-5 p-5 bg-white ${neoBorder} shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${neoHover} group`}>
                <div className={`w-12 h-12 bg-emerald-50 ${neoBorder} flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Dasbor Administrator</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">Pengaturan menu, QR, & analisis data.</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}