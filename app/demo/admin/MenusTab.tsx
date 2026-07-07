'use client';

import React from 'react';
import { formatRupiah } from '../../dashboard/kasir/formatHelpers';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description: string | null;
}

interface MenusTabProps {
  menus: MenuItem[];
  onToggleAvailability: (id: string) => void;
}

/**
 * Tab panel untuk pengelolaan menu toko dalam mode demo (tanpa emoji)
 */
export default function MenusTab({ menus, onToggleAvailability }: MenusTabProps) {
  return (
    <div className="bg-[#F5F2EB]">
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Kelola Menu Kafe</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{menus.length} item aktif terdaftar</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all">
          Tambah Menu
        </button>
      </div>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((menu) => (
            <div key={menu.id} className="bg-white border border-[#1A1A1A]/8 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
              <div className="h-36 bg-[#F5F2EB] relative flex items-center justify-center text-4xl">
                Menu
                <button
                  onClick={() => onToggleAvailability(menu.id)}
                  className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                    menu.is_available ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  {menu.is_available ? 'Tersedia' : 'Habis'}
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#1A1A1A] truncate">{menu.name}</h3>
                {menu.description && (<p className="text-xs text-[#1A1A1A]/40 mt-0.5 line-clamp-1">{menu.description}</p>)}
                <p className="text-base font-bold text-[#1A1A1A] mt-1.5">{formatRupiah(menu.price)}</p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 text-xs border border-[#1A1A1A]/20 text-[#1A1A1A] rounded-lg hover:bg-[#1A1A1A]/5 transition-colors font-medium">Edit</button>
                  <button className="flex-1 py-2 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium">Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
