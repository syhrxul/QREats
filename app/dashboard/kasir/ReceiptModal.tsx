'use client';

import React from 'react';

interface ReceiptModalProps {
  receiptUrl: string;
  tableNumber?: string | null;
  onClose: () => void;
}

/**
 * Modal untuk menampilkan zoom bukti transfer pembayaran pelanggan
 */
export default function ReceiptModal({ receiptUrl, tableNumber, onClose }: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl border border-[#1A1A1A]/10">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]/10 bg-white">
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-sm">Preview Struk</h3>
            {tableNumber && (
              <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5">{tableNumber}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/20 transition-colors text-sm"
          >
            Tutup
          </button>
        </div>
        
        {/* Gambar Struk */}
        <div className="p-4 bg-white flex items-center justify-center min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receiptUrl}
            alt="Bukti Transfer Pembayaran"
            className="w-full h-auto object-contain max-h-[60vh] rounded-xl border border-[#1A1A1A]/5"
          />
        </div>
        
        {/* Footer Modal */}
        <div className="p-4 bg-[#F5F2EB] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
}
