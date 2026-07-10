import React from 'react';
import { Send, X } from 'lucide-react';

interface FeedbackComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  composeContent: string;
  setComposeContent: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function FeedbackComposeModal({
  isOpen, onClose, isOwner, composeContent, setComposeContent, isSubmitting, onSubmit
}: FeedbackComposeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#1A1A1A]/10 animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]/10 bg-[#F5F2EB]/50">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#1A1A1A]" />
            <h3 className="font-black text-[#1A1A1A]">Tulis Saran Baru</h3>
          </div>
          <button onClick={onClose} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs text-[#1A1A1A]/60 mb-4 leading-relaxed">
            {isOwner ? 'Kirimkan masukan atau laporan permasalahan langsung ke Superadmin pusat.' : 'Kirimkan masukan atau laporan kepada Owner toko Anda.'}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <textarea
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              placeholder="Ketik pesan Anda di sini..."
              className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20 text-sm text-[#1A1A1A] min-h-[120px] resize-none placeholder:text-[#1A1A1A]/30"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !composeContent.trim()}
              className="w-full py-3.5 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50 active:scale-[0.98] shadow-md cursor-pointer flex justify-center items-center gap-2"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
