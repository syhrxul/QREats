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
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#1A1A1A]/10 animate-fade-in-up">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]/10 bg-[#F5F2EB]/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#1A1A1A]" />
            <h3 className="font-black text-[#1A1A1A]">Kritik & Saran</h3>
          </div>
          <button onClick={onClose} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-[#1A1A1A]/60 mb-4 leading-relaxed">
            Masukan Anda sangat berarti bagi kami untuk meningkatkan pelayanan. Kritik & saran yang dikirimkan bersifat anonim.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan keluhan atau masukan Anda di sini..."
                className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20 text-sm text-[#1A1A1A] min-h-[120px] resize-none placeholder:text-[#1A1A1A]/30"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full py-3.5 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50 active:scale-[0.98] shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Sekarang'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
