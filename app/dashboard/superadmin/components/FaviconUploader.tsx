'use client';

import React from 'react';

interface Props {
  currentFavicon: string | null;
  uploading: boolean;
  uploadError: string;
  uploadSuccess: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FaviconUploader({ currentFavicon, uploading, uploadError, uploadSuccess, onFileChange }: Props) {
  return (
    <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm mb-6 space-y-4">
      <div>
        <h3 className="font-bold text-[#1A1A1A] text-base font-sans">Pengaturan Logo & Favicon</h3>
        <p className="text-xs text-[#1A1A1A]/40 mt-0.5 font-sans">Unggah logo utama situs (ico/png/jpg), maksimal 2MB.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-16 h-16 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
          {currentFavicon ? (
            <img src={currentFavicon} alt="Favicon Preview" className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded" />
          )}
        </div>

        <div className="flex-1 space-y-2 w-full">
          <input
            type="file"
            accept=".ico,.png,.jpg,.jpeg"
            onChange={onFileChange}
            disabled={uploading}
            className="block w-full text-xs text-[#1A1A1A]/50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1A1A1A] file:text-white hover:file:bg-[#333] cursor-pointer"
          />
          <p className="text-[10px] text-[#1A1A1A]/35 font-sans">Mendukung .ico/.png/.jpg, maksimal 2MB.</p>
        </div>
      </div>

      {uploadError && <p className="text-xs font-semibold text-red-500 font-sans">{uploadError}</p>}
      {uploadSuccess && <p className="text-xs font-semibold text-emerald-600 font-sans">Logo berhasil diunggah.</p>}
    </div>
  );
}
