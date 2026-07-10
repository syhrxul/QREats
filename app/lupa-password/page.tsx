'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function LupaPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      localStorage.setItem('qreats_reset_email', email.trim());
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
      });
      if (error) throw error;
      setMessage({ text: 'Tautan reset kata sandi telah dikirim ke email Anda. Silakan cek kotak masuk atau folder spam Anda.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Gagal mengirim email reset', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6EE] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-900 text-[#F9F6EE] mb-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Lupa Password?</h1>
          <p className="text-sm text-slate-900/60 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            Masukkan email Anda, dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-900/5 p-8 backdrop-blur-sm">
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900/70 mb-1.5">
                Email Terdaftar
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@gmail.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-900/15 rounded-xl text-slate-900 placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-slate-900/40 transition-all"
              />
            </div>

            {message && (
              <div className={`px-4 py-3 border rounded-xl text-sm leading-relaxed ${
                message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
            </button>
          </form>
          
          <div className="text-center mt-5">
            <a href="/login" className="text-xs text-slate-900/40 font-semibold underline underline-offset-2 hover:text-slate-900">
              Kembali ke Halaman Login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
