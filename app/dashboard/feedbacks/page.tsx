'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { MessageSquare, ArrowUpRight, Check, Clock, Send } from 'lucide-react';
import useToast from '../../hooks/useToast';
import ToastContainer from '../../components/Toast';
import { FeedbackComposeModal } from './_components/FeedbackComposeModal';

export interface Feedback {
  id: string;
  shop_id: string;
  content: string;
  escalation_level: 'shop' | 'owner' | 'superadmin';
  is_read: boolean;
  created_at: string;
}

export default function FeedbacksPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [role, setRole] = useState<'owner' | 'admin' | 'kasir' | 'superadmin' | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shop' | 'owner'>('shop');
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthChecking(false); return; }
      const { data: profile } = await supabase.from('profiles').select('role, shop_id').eq('id', user.id).single();
      if (profile) { setRole(profile.role as any); setShopId(profile.shop_id); }
      setAuthChecking(false);
    }
    checkUser();
  }, []);

  const fetchFeedbacks = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('feedbacks').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
      if (error) throw error;
      setFeedbacks(data as Feedback[] || []);
    } catch (e: any) { addToast('Gagal mengambil data: ' + e.message, 'error'); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authChecking && shopId) fetchFeedbacks();
  }, [authChecking, shopId]);

  const handleEscalate = async (id: string, currentLevel: string) => {
    if (!confirm('Teruskan pesan ini ke atasan?')) return;
    const newLevel = (currentLevel === 'owner' || (currentLevel === 'shop' && role === 'owner')) ? 'superadmin' : 'owner';
    try {
      const { error } = await supabase.from('feedbacks').update({ escalation_level: newLevel }).eq('id', id);
      if (error) throw error;
      addToast(`Diteruskan ke ${newLevel === 'superadmin' ? 'Pusat' : 'Owner'}`, 'success');
      fetchFeedbacks();
    } catch (e: any) { addToast('Gagal meneruskan: ' + e.message, 'error'); }
  };

  const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('feedbacks').update({ is_read: !currentStatus }).eq('id', id);
      if (error) throw error;
      fetchFeedbacks();
    } catch (e: any) { addToast('Gagal menandai: ' + e.message, 'error'); }
  };

  const isOwner = role === 'owner';

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeContent.trim() || !shopId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert([{ shop_id: shopId, content: composeContent.trim(), escalation_level: isOwner ? 'superadmin' : 'owner' }]);
      if (error) throw error;
      addToast(`Berhasil dikirim ke ${isOwner ? 'Pusat' : 'Owner'}`, 'success');
      setComposeContent(''); setIsComposeOpen(false); fetchFeedbacks();
    } catch (err: any) { addToast('Gagal mengirim: ' + err.message, 'error'); } finally { setIsSubmitting(false); }
  };

  if (authChecking) return <div className="flex items-center justify-center min-h-screen bg-[#F5F2EB]"><div className="w-8 h-8 border-2 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin"></div></div>;
  if (!role || role === 'superadmin') return <div className="flex items-center justify-center min-h-screen bg-[#F5F2EB]"><p className="text-sm font-bold text-[#1A1A1A]/50">Akses ditolak.</p></div>;
  
  const displayFeedbacks = feedbacks.filter((f) => isOwner ? f.escalation_level === activeTab : f.escalation_level === 'shop');

  return (
    <div className="bg-[#F5F2EB] min-h-screen pb-10">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
          <div><h1 className="text-lg font-black text-[#1A1A1A]">Kritik & Saran</h1><p className="text-xs text-[#1A1A1A]/50 mt-0.5">Kelola keluhan dan masukan dari pelanggan</p></div>
        </div>
        <button onClick={() => setIsComposeOpen(true)} className="px-4 py-2 bg-[#1A1A1A] text-white font-bold text-xs rounded-xl hover:bg-[#333] transition-all cursor-pointer flex items-center gap-2 shadow-sm"><Send className="w-3.5 h-3.5" />Tulis Saran</button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {isOwner && (
          <div className="flex gap-2 mb-6">
            {['shop', 'owner'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-[#1A1A1A] text-white shadow-md' : 'bg-white text-[#1A1A1A]/70 border border-[#1A1A1A]/10 hover:bg-gray-50'}`}>
                {tab === 'shop' ? 'Semua Masukan' : 'Diteruskan Kasir'}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/50 border border-[#1A1A1A]/5 rounded-2xl animate-pulse" />)}</div>
        ) : displayFeedbacks.length === 0 ? (
          <div className="bg-white border border-[#1A1A1A]/5 rounded-3xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#F5F2EB] rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-500" /></div>
            <h3 className="text-base font-bold text-[#1A1A1A]">Belum ada masukan.</h3><p className="text-sm text-[#1A1A1A]/50 mt-1">Pelayanan Anda sangat baik sejauh ini!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayFeedbacks.map((f) => (
              <div key={f.id} className={`bg-white border ${f.is_read ? 'border-[#1A1A1A]/5 opacity-70' : 'border-[#1A1A1A]/15 shadow-sm'} rounded-3xl p-5 transition-all`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!f.is_read && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                      <span className="text-[10px] font-bold text-[#1A1A1A]/40 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(f.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed font-medium">"{f.content}"</p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button onClick={() => handleMarkAsRead(f.id, f.is_read)} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${f.is_read ? 'bg-[#F5F2EB] text-[#1A1A1A]/50 border-transparent hover:bg-[#1A1A1A]/5' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}>
                      {f.is_read ? 'Tandai Belum Dibaca' : 'Tandai Dibaca'}
                    </button>
                    <button onClick={() => handleEscalate(f.id, f.escalation_level)} className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#333] transition-all active:scale-95 shadow-sm">
                      Teruskan ke {!isOwner ? 'Owner' : 'Pusat'}<ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <FeedbackComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} isOwner={isOwner} composeContent={composeContent} setComposeContent={setComposeContent} isSubmitting={isSubmitting} onSubmit={handleSubmitFeedback} />
    </div>
  );
}
