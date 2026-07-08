'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string>('Init...');

  const log = (msg: string) => {
    setDebugLog(prev => prev + '\n' + msg);
  };

  useEffect(() => {
    log('Component mounted');
    let storedEmail = null;
    try {
      storedEmail = localStorage.getItem('qreats_reset_email');
    } catch (err: any) {
      log('localStorage error: ' + err?.message);
    }
    
    if (storedEmail) {
      setUserEmail(storedEmail);
      log('Loaded email: ' + storedEmail);
    }

    const hash = window.location.hash;
    log('Hash present: ' + !!hash);
    if (hash && hash.includes('error_description')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const errDesc = params.get('error_description');
      if (errDesc) {
        setErrorMsg('Tautan Tidak Valid: ' + decodeURIComponent(errDesc.replace(/\+/g, ' ')));
        setSessionChecking(false);
        log('Error in hash found');
        return;
      }
    }
    
    const checkSession = async () => {
      try {
        log('Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) log('Session err: ' + error.message);
        
        if (!session && window.location.hash.includes('access_token')) {
          log('No session but hash has token. Waiting 1.5s...');
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (!retrySession) {
              log('Session retry failed');
              setErrorMsg('Sesi gagal dimuat dari tautan. Pastikan Anda membuka tautan terbaru.');
            } else {
              log('Session retry success');
            }
            setSessionChecking(false);
          }, 1500);
        } else if (!session && !window.location.hash.includes('access_token')) {
          log('No session, no token');
          setErrorMsg('Akses Ditolak: Anda memerlukan tautan reset sandi yang valid.');
          setSessionChecking(false);
        } else {
          log('Session found immediately');
          setSessionChecking(false);
        }
      } catch (err: any) {
        log('Check session crash: ' + err?.message);
        setSessionChecking(false);
      }
    };

    checkSession();
  }, []);

  async function handleUpdatePassword() {
    try {
      log('Button clicked');
      setErrorMsg(null);
      
      const inputEl = document.getElementById('password') as HTMLInputElement;
      const currentPassword = password || (inputEl ? inputEl.value : '');
      
      if (!currentPassword.trim()) {
        setErrorMsg('Silakan masukkan kata sandi.');
        log('Empty password');
        return;
      }
      if (currentPassword.length < 6) {
        setErrorMsg('Password minimal 6 karakter.');
        log('Password too short');
        return;
      }
      
      setLoading(true);
      log('Calling updateUser...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        log('Pre-update session check failed');
        throw new Error('Sesi sudah kedaluwarsa. Silakan minta tautan baru.');
      }

      const { data, error } = await supabase.auth.updateUser({
        password: currentPassword
      });
      
      if (error) {
        log('Update error: ' + error.message);
        throw error;
      }
      
      log('Update success');
      localStorage.removeItem('qreats_reset_email');
      setSuccessMsg('Berhasil! Kata sandi telah diubah. Mengalihkan ke halaman login...');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (err: any) {
      log('Catch error: ' + (err?.message || 'Unknown'));
      setErrorMsg(err?.message || 'Terjadi kesalahan tidak diketahui.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6EE] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1A1A1A] text-[#F9F6EE] mb-4 shadow-xl transform rotate-6 hover:rotate-0 transition-transform duration-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tighter">Kata Sandi Baru</h1>
          <p className="text-sm text-[#1A1A1A]/60 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            Masukkan kata sandi baru Anda di bawah ini untuk mengakses kembali akun QREats Anda.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#1A1A1A]/5 p-8 backdrop-blur-sm">
          <div className="space-y-5">
            
            {userEmail && (
              <div className="bg-[#F5F2EB]/50 p-4 rounded-xl border border-[#1A1A1A]/5 mb-6 text-center">
                <span className="text-[10px] font-bold text-[#1A1A1A]/40 block uppercase tracking-wide mb-1">Mengatur sandi untuk</span>
                <span className="font-bold text-[#1A1A1A]">{userEmail}</span>
              </div>
            )}
            
            {/* Inline Error/Success Messages */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium mb-4">
                ❌ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium mb-4">
                ✅ {successMsg}
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A]/70 mb-1.5">
                Password Baru
              </label>
              <input type="text" autoComplete="username" style={{ display: 'none' }} />
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={sessionChecking || !!errorMsg || !!successMsg}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdatePassword();
                }}
                placeholder={sessionChecking ? "Memverifikasi tautan..." : "Minimal 6 karakter"}
                className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]/40 transition-all disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={() => handleUpdatePassword()}
              disabled={loading || sessionChecking || !!errorMsg || !!successMsg}
              className="w-full py-3.5 bg-[#1A1A1A] text-white font-medium text-sm rounded-xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {sessionChecking ? 'Memproses Tautan...' : loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
            
          </div>
        </div>
      </div>
    </main>
  );
}