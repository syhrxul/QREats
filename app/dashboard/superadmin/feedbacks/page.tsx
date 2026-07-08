'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { MessageSquare, Check, RefreshCw, Clock, Building } from 'lucide-react';
import useToast from '../../../hooks/useToast';
import ToastContainer from '../../../components/Toast';

interface EscalatedFeedback {
  id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  shops: {
    name: string;
  };
}

export default function SuperadminFeedbacksPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [feedbacks, setFeedbacks] = useState<EscalatedFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthChecking(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profile || profile.role !== 'superadmin') {
        window.location.href = '/dashboard';
        return;
      }
      setAuthChecking(false);
    }
    checkAccess();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select(`
          id, content, is_read, created_at,
          shops (name)
        `)
        .eq('escalation_level', 'superadmin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data as any || []);
    } catch (e: any) {
      addToast('Gagal mengambil data eskalasi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking) {
      fetchFeedbacks();
    }
  }, [authChecking]);

  const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ is_read: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchFeedbacks();
    } catch (e: any) {
      addToast('Gagal mengubah status: ' + e.message, 'error');
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F2EB]">
        <div className="w-8 h-8 border-2 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans pb-10">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/50 border border-[#1A1A1A]/5 rounded-3xl animate-pulse" />)}
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white border border-[#1A1A1A]/5 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-[#1A1A1A]">Pusat Aman Terkendali</h3>
              <p className="text-sm text-[#1A1A1A]/50 mt-2">Tidak ada kritik dan saran yang dieskalasi ke pusat saat ini.</p>
            </div>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className={`bg-white border ${f.is_read ? 'border-[#1A1A1A]/5 opacity-70' : 'border-[#1A1A1A]/15 shadow-md'} rounded-3xl p-6 transition-all`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {!f.is_read && (
                         <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Baru</span>
                      )}
                      <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5 bg-[#F5F2EB] px-2.5 py-1 rounded-lg">
                        <Building className="w-3.5 h-3.5 text-[#1A1A1A]/60" />
                        {f.shops?.name || 'Toko Tidak Diketahui'}
                      </span>
                      <span className="text-[10px] font-bold text-[#1A1A1A]/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(f.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bg-[#F5F2EB]/50 p-4 rounded-2xl border border-[#1A1A1A]/5">
                      <p className="text-sm text-[#1A1A1A] leading-relaxed font-medium">"{f.content}"</p>
                    </div>
                  </div>
                  
                  <div className="min-w-[140px] text-right">
                    <button
                      onClick={() => handleMarkAsRead(f.id, f.is_read)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
                        f.is_read 
                          ? 'bg-[#F5F2EB] text-[#1A1A1A]/50 border-transparent hover:bg-[#1A1A1A]/5 cursor-pointer' 
                          : 'bg-[#1A1A1A] text-white border-transparent hover:bg-[#333] shadow-sm cursor-pointer'
                      }`}
                    >
                      {f.is_read ? 'Tandai Belum Dibaca' : 'Tandai Selesai'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
