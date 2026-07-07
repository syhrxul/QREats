'use client';

import React from 'react';

interface QRGeneratorTabProps {
  tables: number[];
}

/**
 * Tab panel untuk generate dan cetak QR code meja dalam mode demo (tanpa emoji)
 */
export default function QRGeneratorTab({ tables }: QRGeneratorTabProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="border-b border-[#1A1A1A]/10 px-2 py-4 mb-6">
        <h2 className="text-lg font-black text-[#1A1A1A]">QR Generator Meja</h2>
        <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Generate QR code unik untuk setiap meja</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map((num) => (
          <div key={num} className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
            <div className="bg-[#F5F2EB] rounded-xl p-4 mb-3 flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" className="opacity-60">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="16" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="16" width="6" height="6" rx="1" />
                <rect x="16" y="16" width="6" height="6" rx="1" />
                <path d="M10 5h4M5 10v4M10 10h4M14 14v4M19 10v4" />
              </svg>
            </div>
            <p className="font-bold text-[#1A1A1A] text-sm">Meja {num}</p>
            <p className="text-[10px] text-[#1A1A1A]/40 mt-0.5">QR-DEMO-{String(num).padStart(3, '0')}</p>
            <button className="mt-3 w-full py-2 text-xs border border-[#1A1A1A]/20 text-[#1A1A1A] rounded-lg hover:bg-[#1A1A1A]/5 transition-colors font-medium">Cetak QR</button>
          </div>
        ))}
      </div>
    </div>
  );
}
