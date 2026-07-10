import { useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { MessageSquare, X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string | null;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function FeedbackModal({ isOpen, onClose, shopId, addToast }: FeedbackModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !shopId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert([{
        shop_id: shopId,
        content: content.trim(),
        escalation_level: 'shop'
      }]);

      if (error) throw error;

      addToast('Kritik & saran berhasil dikirim. Terima kasih!', 'success');
      setContent('');
      onClose();
    } catch (err: any) {
      addToast('Gagal mengirim: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 border border-slate-900/10 animate-fade-in-up">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900/10 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-900" />
            <h3 className="font-bold text-slate-900">Kritik & Saran</h3>
          </div>
          <button onClick={onClose} className="text-slate-900/40 hover:text-slate-900 p-1 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-900/60 mb-4 leading-relaxed">
            Masukan Anda sangat berarti bagi kami untuk meningkatkan pelayanan. Kritik & saran yang dikirimkan bersifat anonim.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan keluhan atau masukan Anda di sini..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-900/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20 text-sm text-slate-900 min-h-[120px] resize-none placeholder:text-slate-900/30"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50 active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 cursor-pointer"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Sekarang'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
