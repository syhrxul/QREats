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

  // Neobrutalism classes
  const neoBorder = "border-4 border-black";
  const neoShadow = "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const neoShadowLg = "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]";
  const neoHover = "hover:-translate-y-1 hover:translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all";
  const neoHoverBtn = "hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all";

  return (
    <main className="min-h-screen bg-[#FFE400] text-black font-sans selection:bg-black selection:text-[#FFE400] flex flex-col overflow-x-hidden">
      
      {/* Header */}
      <header className={`max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center ${neoBorder} bg-white border-x-0 border-t-0 shadow-[0_4px_0_0_rgba(0,0,0,1)] z-10 sticky top-0`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-[#FF4911] flex items-center justify-center ${neoBorder} ${neoShadow}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="square">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
            </svg>
          </div>
          <span className="text-3xl font-black tracking-tighter uppercase">QREats</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowDemoModal(true)} className={`hidden sm:flex items-center gap-2 px-4 py-2.5 bg-cyan-400 font-black uppercase text-sm ${neoBorder} ${neoShadow} ${neoHoverBtn}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="3">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            DEMO
          </button>
          {loading ? null : hasSession ? (
            <Link href="/dashboard/menus" className={`px-6 py-2.5 bg-black text-[#FFE400] font-black uppercase text-sm ${neoBorder} hover:bg-gray-800 transition-colors`}>DASHBOARD</Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-block px-4 py-2 font-black uppercase text-sm hover:underline underline-offset-4 decoration-4">LOGIN STAF</Link>
              <Link href="/register" className={`px-6 py-2.5 bg-[#00E676] font-black uppercase text-sm ${neoBorder} ${neoShadow} ${neoHoverBtn}`}>BUAT TOKO</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl w-full mx-auto px-6 py-20 md:py-32 grid grid-cols-1 md:grid-cols-12 gap-16 items-center flex-grow overflow-hidden">
        {/* Decorative elements */}
        <div className={`absolute top-10 left-10 w-24 h-24 bg-pink-500 rounded-full ${neoBorder} ${neoShadowLg} -z-10 animate-bounce`}></div>
        <div className={`absolute bottom-20 right-10 w-32 h-32 bg-cyan-400 rotate-12 ${neoBorder} ${neoShadowLg} -z-10`}></div>
        
        <div className="md:col-span-7 space-y-8 z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white font-black uppercase tracking-widest text-xs ${neoBorder} ${neoShadow} rotate-2`}>
            <span className="w-3 h-3 bg-[#00E676] border-2 border-black animate-pulse" />
            100% TANPA APLIKASI
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[1] text-black">
            KELOLA ORDER & <span className="bg-[#00E676] px-2 py-1 mx-1 border-4 border-black inline-block -rotate-2">KASIR</span> LEWAT 1 QR CODE!
          </h1>
          <p className="text-xl sm:text-2xl font-bold leading-snug max-w-2xl bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Pelanggan scan, pesan, & bayar langsung dari meja. Kasir terima notifikasi instan. <span className="bg-[#FFE400] px-1">BOOM! Order selesai.</span>
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            {hasSession ? (
              <Link href="/dashboard/menus" className={`px-8 py-5 bg-[#FF4911] text-white font-black uppercase text-lg ${neoBorder} ${neoShadowLg} ${neoHover} flex items-center gap-2`}>MASUK KE DASHBOARD ➔</Link>
            ) : (
              <>
                <Link href="/register" className={`px-10 py-5 bg-[#FF4911] text-white font-black uppercase text-lg ${neoBorder} ${neoShadowLg} ${neoHover} text-center`}>DAFTAR GRATIS</Link>
                <button onClick={() => setShowDemoModal(true)} className={`px-10 py-5 bg-white text-black font-black uppercase text-lg ${neoBorder} ${neoShadowLg} ${neoHover} text-center flex justify-center items-center gap-3`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="3">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  COBA DEMO
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Hero Illustration */}
        <div className="md:col-span-5 relative flex justify-center z-10">
          <div className={`bg-white ${neoBorder} ${neoShadowLg} p-6 w-full max-w-sm space-y-6 relative -rotate-3 hover:rotate-0 transition-transform duration-300`}>
            <div className="absolute -top-6 -right-6 bg-[#00E676] px-4 py-2 font-black uppercase text-lg border-4 border-black rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              LIVE DEMO
            </div>
            
            <div className={`flex flex-col items-center justify-center py-10 bg-cyan-400 ${neoBorder} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
              <svg width="100" height="100" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="2" className="opacity-100">
                <rect x="2" y="2" width="6" height="6" />
                <rect x="16" y="2" width="6" height="6" />
                <rect x="2" y="16" width="6" height="6" />
                <rect x="16" y="16" width="6" height="6" />
                <path d="M10 5h4M5 10v4M10 10h4M14 14v4M19 10v4" />
              </svg>
              <p className="text-sm font-black mt-4 uppercase bg-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">SCAN MEJA 5</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 bg-pink-400 ${neoBorder} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center`}>
                <p className="text-xs font-black uppercase text-black">ANTREAN</p>
                <p className="text-3xl font-black text-white mt-1">4</p>
              </div>
              <div className={`p-4 bg-[#FFE400] ${neoBorder} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center`}>
                <p className="text-xs font-black uppercase text-black">SELESAI</p>
                <p className="text-3xl font-black text-black mt-1">23</p>
              </div>
            </div>
            
            <div className={`bg-white border-4 border-black p-4 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
              <div className="w-6 h-6 bg-[#00E676] border-2 border-black flex items-center justify-center">✓</div>
              <p className="text-sm font-black uppercase">2x ES KOPI, 1x NASI</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`bg-black py-16 border-y-4 border-black shadow-[0_8px_0_0_rgba(0,0,0,1)] relative z-20`}>
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y-4 sm:divide-y-0 sm:divide-x-4 divide-[#FFE400] border-4 border-[#FFE400] shadow-[8px_8px_0px_0px_rgba(255,228,0,1)] bg-black p-8">
          <div className="p-4">
            <p className="text-5xl md:text-6xl font-black text-cyan-400">{statCounter.orders.toLocaleString('id-ID')}+</p>
            <p className="text-lg text-white font-black uppercase tracking-widest mt-2">PESANAN DIPROSES</p>
          </div>
          <div className="p-4">
            <p className="text-5xl md:text-6xl font-black text-[#00E676]">{statCounter.merchants}+</p>
            <p className="text-lg text-white font-black uppercase tracking-widest mt-2">MERCHANT DAFTAR</p>
          </div>
          <div className="p-4">
            <p className="text-5xl md:text-6xl font-black text-pink-500">{statCounter.tables.toLocaleString('id-ID')}+</p>
            <p className="text-lg text-white font-black uppercase tracking-widest mt-2">MEJA TERHUBUNG</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-24 relative">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-16 relative">
            <h2 className="text-5xl sm:text-6xl font-black uppercase inline-block bg-[#FFE400] px-4 py-2 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-1">KENAPA QREATS?</h2>
            <p className="text-xl font-bold mt-8 max-w-2xl mx-auto border-4 border-black p-4 bg-cyan-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Sistem kasir brutal & brutal cepat. Tanpa alat kasir mahal, cukup pakai HP!</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: "📱",
                title: 'QR SELF-ORDER',
                desc: 'Scan dari meja, pilih menu, langsung checkout. Tanpa basa-basi.',
                bg: 'bg-pink-400'
              },
              {
                icon: "🔔",
                title: 'NOTIF REAL-TIME',
                desc: 'Ting! Pesanan masuk layar kasir detik itu juga. Ga perlu refresh.',
                bg: 'bg-[#00E676]'
              },
              {
                icon: "💳",
                title: 'CEK TRANSFER',
                desc: 'Verifikasi bukti transfer super kilat. 1 Klik lunas, 1 Klik tolak.',
                bg: 'bg-cyan-400'
              },
              {
                icon: "📈",
                title: 'ANALISIS BISNIS',
                desc: 'Dashboard menu terlaris dan grafik penjualan brutal yang akurat.',
                bg: 'bg-[#FFE400]'
              },
            ].map((f, i) => (
              <div key={i} className={`${f.bg} ${neoBorder} ${neoShadowLg} p-8 ${neoHover} transform transition-transform`}>
                <div className={`w-16 h-16 bg-white ${neoBorder} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-3xl mb-6`}>{f.icon}</div>
                <h3 className="text-2xl font-black uppercase mb-3 bg-white px-2 py-1 inline-block border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{f.title}</h3>
                <p className="text-base font-bold text-black leading-tight bg-white/70 p-2 border-2 border-black">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-pink-500 border-t-4 border-black relative">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl sm:text-6xl font-black uppercase text-white bg-black inline-block px-4 py-2 border-4 border-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] rotate-1">3 LANGKAH KILAT</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { num: '1', title: 'DAFTAR TOKO', desc: 'Isi nama, masukkan menu, kasih harga. Selesai 5 menit.', color: 'bg-[#FFE400]' },
              { num: '2', title: 'CETAK QR', desc: 'Print QR meja dari dashboard. Tempel di meja kafe.', color: 'bg-cyan-400' },
              { num: '3', title: 'TERIMA CUAN', desc: 'Pesanan masuk otomatis, verifikasi kasir, sajikan!', color: 'bg-[#00E676]' },
            ].map((s, i) => (
              <div key={i} className="text-center flex flex-col items-center">
                <div className={`w-24 h-24 ${s.color} ${neoBorder} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black text-5xl font-black mb-6 rotate-3`}>{s.num}</div>
                <h3 className="text-2xl font-black text-black bg-white px-3 py-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">{s.title}</h3>
                <p className="text-lg font-bold text-black bg-white/90 p-4 border-4 border-black">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white border-t-4 border-black">
        <div className="max-w-7xl w-full mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl sm:text-6xl font-black text-black uppercase">PILIH SENJATAMU</h2>
            <p className="text-xl font-bold mt-4 border-4 border-black p-3 bg-[#FFE400] inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Paket brutal murah untuk UMKM F&B.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Paket Basic */}
            <div className={`bg-[#F5F2EB] ${neoBorder} ${neoShadowLg} p-10 flex flex-col hover:-translate-y-2 transition-transform`}>
              <div className="mb-8">
                <span className="bg-black text-[#FFE400] text-sm font-black px-4 py-2 uppercase border-4 border-black">KEDAI BARU</span>
                <h3 className="text-5xl font-black mt-6">BASIC</h3>
                <p className="text-lg font-bold mt-2">Untuk kedai pinggir jalan atau warkop modal pas-pasan.</p>
              </div>
              <div className="flex-1">
                <p className="text-xl font-black uppercase mb-4 bg-white inline-block px-2 border-2 border-black">FITUR:</p>
                <ul className="space-y-4 font-bold text-lg">
                  <li className="flex items-center gap-3"><span className="bg-[#00E676] w-6 h-6 flex items-center justify-center border-2 border-black">✓</span> 20 Meja QR Code</li>
                  <li className="flex items-center gap-3"><span className="bg-[#00E676] w-6 h-6 flex items-center justify-center border-2 border-black">✓</span> 1 Akun Kasir Utama</li>
                  <li className="flex items-center gap-3"><span className="bg-[#00E676] w-6 h-6 flex items-center justify-center border-2 border-black">✓</span> Notifikasi Real-time</li>
                  <li className="flex items-center gap-3"><span className="bg-[#00E676] w-6 h-6 flex items-center justify-center border-2 border-black">✓</span> Menu Digital Bebas</li>
                </ul>
              </div>
            </div>

            {/* Paket Pro */}
            <div className={`bg-[#FF4911] text-white ${neoBorder} shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-10 flex flex-col relative hover:-translate-y-2 transition-transform`}>
              <div className="absolute -top-6 -right-6 bg-[#FFE400] text-black font-black uppercase text-2xl px-6 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-6 animate-pulse">
                PALING BRUTAL!
              </div>
              <div className="mb-8">
                <span className="bg-white text-black text-sm font-black px-4 py-2 uppercase border-4 border-black">RESTORAN RAMAI</span>
                <h3 className="text-5xl font-black mt-6">PRO</h3>
                <p className="text-lg font-bold mt-2">Scale-up bisnis tanpa limit, gilas semua antrean.</p>
              </div>
              <div className="flex-1">
                <p className="text-xl font-black text-black uppercase mb-4 bg-white inline-block px-2 border-2 border-black">FITUR:</p>
                <ul className="space-y-4 font-bold text-lg">
                  <li className="flex items-center gap-3"><span className="bg-black text-[#FFE400] w-6 h-6 flex items-center justify-center border-2 border-black">∞</span> UNLIMITED Meja</li>
                  <li className="flex items-center gap-3"><span className="bg-black text-[#FFE400] w-6 h-6 flex items-center justify-center border-2 border-black">∞</span> UNLIMITED Kasir</li>
                  <li className="flex items-center gap-3"><span className="bg-white text-black w-6 h-6 flex items-center justify-center border-2 border-black">✓</span> Semua Fitur Basic</li>
                  <li className="flex items-center gap-3"><span className="bg-white text-black w-6 h-6 flex items-center justify-center border-2 border-black">✓</span> Laporan Analisis Lengkap</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-cyan-400 py-24 border-t-4 border-black">
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 sticky top-28 h-fit">
            <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-2">
              <h2 className="text-5xl font-black uppercase leading-[1] mb-6">BANYAK<br/>TANYA?</h2>
              <p className="text-xl font-bold bg-[#FFE400] p-2 border-2 border-black">Cari jawaban dari keraguanmu di sini!</p>
            </div>
          </div>
          <div className="md:col-span-7 space-y-6">
            {[
              {
                q: "APA ITU QREATS?",
                a: "SaaS POS & self-order brutal berbasis QR code. Ga butuh mesin kasir mahal, cukup HP."
              },
              {
                q: "HARUS INSTALL APLIKASI?",
                a: "BIG NO! Cukup scan QR pakai kamera HP, langsung pesan via browser web. Simpel."
              },
              {
                q: "BAYARNYA GIMANA?",
                a: "Pelanggan transfer, upload bukti struk. Kasir dapet notif, tinggal klik 'LUNAS' kalau valid."
              },
              {
                q: "BISA BUAT WARUNG TENDAN?",
                a: "SANGAT BISA! Gak perduli food court, gerobak, atau resto mewah. Semua bisa pakai."
              },
              {
                q: "BERAPA HARGANYA?",
                a: "Daftar aja dulu gratis! Paket berlangganan jauh lebih murah dari rokok sebulan."
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className={`bg-white ${neoBorder} transition-all duration-300 ${openFaq === i ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] translate-x-1 -translate-y-1' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <h3 className={`font-black uppercase text-xl ${openFaq === i ? 'text-[#FF4911]' : 'text-black'}`}>
                    {faq.q}
                  </h3>
                  <div className={`w-10 h-10 border-4 border-black flex items-center justify-center font-black text-2xl transition-transform ${openFaq === i ? 'bg-[#FF4911] text-white rotate-180' : 'bg-[#FFE400] text-black'}`}>
                    ↓
                  </div>
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-lg font-bold border-t-4 border-black pt-4 bg-[#F5F2EB]">
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
      <section className="bg-[#FFE400] py-24 border-t-4 border-black text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-6xl font-black uppercase mb-6 bg-white inline-block px-4 py-2 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-2">GAS SEKARANG JUGA!</h2>
          <p className="text-2xl font-bold mb-12 bg-black text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] inline-block -rotate-1">Tingkatkan omset, kurangi antrean.</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <Link href="/register" className={`px-12 py-6 bg-[#00E676] text-black font-black uppercase text-2xl ${neoBorder} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:translate-x-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all`}>DAFTAR GRATIS</Link>
            <button onClick={() => setShowDemoModal(true)} className={`px-12 py-6 bg-white text-black font-black uppercase text-2xl ${neoBorder} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:translate-x-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all`}>LIHAT DEMO</button>
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDemoModal(false)} />
          <div className={`relative bg-[#FF4911] ${neoBorder} shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-8 max-w-lg w-full`}>
            <button onClick={() => setShowDemoModal(false)} className={`absolute -top-5 -right-5 w-12 h-12 bg-white ${neoBorder} flex items-center justify-center text-3xl font-black hover:bg-[#FFE400] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>✕</button>
            <div className="text-center mb-8">
              <h3 className="text-4xl font-black text-white uppercase bg-black px-2 py-1 inline-block border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] -rotate-2">PILIH MODE DEMO</h3>
            </div>
            <div className="space-y-6">
              <Link href="/demo/kasir" onClick={() => setShowDemoModal(false)} className={`flex items-center gap-6 p-6 bg-white ${neoBorder} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${neoHover} group`}>
                <div className={`w-16 h-16 bg-[#FFE400] ${neoBorder} flex items-center justify-center text-4xl group-hover:scale-110 transition-transform`}>
                  💰
                </div>
                <div>
                  <h4 className="font-black text-xl uppercase">DASHBOARD KASIR</h4>
                  <p className="text-sm font-bold mt-1">Cek antrean, verif pembayaran.</p>
                </div>
              </Link>
              <Link href="/demo/admin" onClick={() => setShowDemoModal(false)} className={`flex items-center gap-6 p-6 bg-white ${neoBorder} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${neoHover} group`}>
                <div className={`w-16 h-16 bg-cyan-400 ${neoBorder} flex items-center justify-center text-4xl group-hover:scale-110 transition-transform`}>
                  ⚙️
                </div>
                <div>
                  <h4 className="font-black text-xl uppercase">DASHBOARD ADMIN</h4>
                  <p className="text-sm font-bold mt-1">Kelola menu, meja, & laporan.</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}