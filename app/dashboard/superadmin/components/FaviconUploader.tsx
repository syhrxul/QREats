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
    <div className="bg-white border border-slate-900/8 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 mb-6 space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-base font-sans">Pengaturan Logo & Favicon</h3>
        <p className="text-xs text-slate-900/40 mt-0.5 font-sans">Unggah logo utama situs (ico/png/jpg), maksimal 2MB.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-16 h-16 bg-slate-50 border border-slate-900/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
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
            className="block w-full text-xs text-slate-900/50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-[#333] cursor-pointer"
          />
          <p className="text-[10px] text-slate-900/35 font-sans">Mendukung .ico/.png/.jpg, maksimal 2MB.</p>
        </div>
      </div>

      {uploadError && <p className="text-xs font-semibold text-red-500 font-sans">{uploadError}</p>}
      {uploadSuccess && <p className="text-xs font-semibold text-emerald-600 font-sans">Logo berhasil diunggah.</p>}
    </div>
  );
}
