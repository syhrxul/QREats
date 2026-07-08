'use client';

import React from 'react';

interface Toast {
  id: string;
  message: string;
}

interface Props {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function Toasts({ toasts, onClose }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div key={t.id} className="bg-[#1A1A1A] text-white border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold">{t.message}</span>
          </div>
          <button onClick={() => onClose(t.id)} className="text-white/60 hover:text-white text-xs font-bold bg-white/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">Tutup</button>
        </div>
      ))}
    </div>
  );
}
