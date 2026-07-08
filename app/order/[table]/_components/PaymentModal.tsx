'use client';

import { Image as ImageIcon, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import { formatRupiah } from '../utils';

interface PaymentModalProps {
  isOpen: boolean;
  tableNumber: string;
  customerName: string;
  totalPrice: number;
  qrisUrl: string | null;
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
  uploadStatus: 'idle' | 'uploading' | 'done' | 'error';
  handleUploadProof: () => void;
  handleDoneOrder: () => void;
}

export function PaymentModal({
  isOpen,
  tableNumber,
  customerName,
  totalPrice,
  qrisUrl,
  uploadFile,
  setUploadFile,
  uploadStatus,
  handleUploadProof,
  handleDoneOrder,
}: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-[#F9F6EE] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl overflow-y-auto max-h-[95vh]">
        
        {/* Header Success */}
        <div className="bg-[#1A1A1A] px-6 pt-6 pb-8 rounded-t-3xl text-center">
          <div className="w-14 h-14 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#1A1A1A]" />
          </div>
          <h3 className="text-white font-bold text-xl">Pesanan Masuk!</h3>
          <p className="text-white/50 text-sm mt-1">Silakan selesaikan pembayaran QRIS</p>
        </div>

        <div className="px-6 pb-6 -mt-2">
          {/* Info Meja & Total */}
          <div className="bg-white rounded-2xl p-4 mb-4 border border-[#1A1A1A]/6">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-[#1A1A1A]/50">Meja</span>
              <span className="font-bold text-[#1A1A1A]">{tableNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-[#1A1A1A]/50">Pemesan</span>
              <span className="font-semibold text-[#1A1A1A]">{customerName}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-[#1A1A1A]/5 pt-2">
              <span className="text-[#1A1A1A]/50">Total Tagihan</span>
              <span className="font-bold text-xl text-[#1A1A1A]" suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
            </div>
          </div>

          {/* TAMPILAN QRIS */}
          <div className="bg-white border-2 border-dashed border-[#1A1A1A]/10 rounded-2xl px-6 py-6 text-center mb-4 space-y-3">
            <p className="font-bold text-[#1A1A1A] text-sm">QRIS Kafe</p>
            {qrisUrl ? (
              <div className="flex justify-center max-w-[180px] mx-auto bg-white p-2 border border-[#1A1A1A]/10 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrisUrl} 
                  alt="QRIS Merchant" 
                  className="w-full object-contain" 
                  // onError is handled in parent
                />
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <Scan className="w-16 h-16 text-[#1A1A1A]/20" />
              </div>
            )}
            <p className="text-xs text-[#1A1A1A]/40">Scan QR Code ini untuk membayar</p>
            <div className="bg-[#F5F2EB] rounded-xl px-4 py-2">
              <p className="text-xs text-[#1A1A1A]/50">Nominal transfer</p>
              <p className="font-bold text-lg text-[#1A1A1A]" suppressHydrationWarning>{formatRupiah(totalPrice)}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-[#1A1A1A]/60 mb-2 uppercase tracking-wide">Bukti Pembayaran</p>
            <label className="block cursor-pointer">
              <input id="input-upload-receipt animate" type="file" accept="image/*" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
              <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${uploadFile ? 'border-[#1A1A1A]/30 bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/15 hover:border-[#1A1A1A]/30'}`}>
                {uploadFile
                  ? <div className="flex flex-col items-center"><ImageIcon className="w-6 h-6 mb-1 text-[#1A1A1A]"/><p className="text-sm font-medium text-[#1A1A1A] truncate">{uploadFile.name}</p></div>
                  : <div className="flex flex-col items-center"><ImageIcon className="w-6 h-6 mb-1 text-[#1A1A1A]/40"/><p className="text-sm font-medium text-[#1A1A1A]/60">Upload screenshot bukti transfer</p></div>
                }
              </div>
            </label>
            {uploadFile && uploadStatus !== 'done' && (
              <button id="btn-upload-proof" onClick={handleUploadProof} disabled={uploadStatus === 'uploading'} className="w-full mt-2.5 py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors hover:bg-[#333]">
                {uploadStatus === 'uploading' ? 'Mengunggah...' : 'Kirim Bukti Bayar'}
              </button>
            )}
            {uploadStatus === 'done' && (
              <div className="flex items-center justify-center gap-2 mt-2.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Bukti berhasil dikirim!</span>
              </div>
            )}
            {uploadStatus === 'error' && (
              <div className="flex items-center justify-center gap-2 mt-2.5 py-2.5">
                 <AlertCircle className="w-4 h-4 text-red-500" />
                 <p className="text-xs text-red-500 font-sans">Gagal upload. Coba lagi.</p>
              </div>
            )}
          </div>

          <button 
            id="btn-done" 
            onClick={handleDoneOrder} 
            disabled={uploadStatus !== 'done'}
            className="w-full py-3.5 border border-[#1A1A1A]/15 text-[#1A1A1A] text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] disabled:bg-[#F5F2EB] disabled:text-[#1A1A1A]/40 font-sans"
          >
            {uploadStatus === 'done' ? 'Selesai' : 'Wajib Unggah Bukti Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
