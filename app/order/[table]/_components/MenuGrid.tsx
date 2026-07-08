'use client';

import { MenuItem } from '../types';
import { formatRupiah } from '../utils';
import { Minus, Plus, Utensils } from 'lucide-react';

interface MenuGridProps {
  menus: MenuItem[];
  getQty: (id: string) => number;
  addToCart: (menu: MenuItem) => void;
  removeFromCart: (id: string) => void;
  justAdded: string | null;
}

export function MenuGrid({ menus, getQty, addToCart, removeFromCart, justAdded }: MenuGridProps) {
  if (menus.length === 0) {
    return (
      <div className="text-center py-24 text-[#1A1A1A]/30">
        <Utensils className="w-12 h-12 mx-auto mb-3" />
        <p className="font-medium">Belum ada menu tersedia</p>
        <p className="text-sm mt-1">Coba kategori lain</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {menus.map((menu) => {
        const qty = getQty(menu.id);
        const isJustAdded = justAdded === menu.id;
        return (
          <div
            key={menu.id}
            className={`bg-white rounded-2xl overflow-hidden border transition-all duration-200 ${
              isJustAdded ? 'border-[#1A1A1A]/40 shadow-md scale-[0.98]' : 'border-[#1A1A1A]/6 hover:shadow-sm hover:-translate-y-0.5'
            }`}
          >
            <div className="relative h-36 bg-[#F0EDE6] overflow-hidden">
              {menu.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/20">
                  <Utensils className="w-10 h-10" />
                </div>
              )}
              {qty > 0 && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">{qty}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-[#1A1A1A] text-sm leading-snug line-clamp-2 mb-0.5">{menu.name}</h3>
              {menu.description && (
                <p className="text-[11px] text-[#1A1A1A]/40 line-clamp-1 mb-1.5">{menu.description}</p>
              )}
              <p className="text-sm font-bold text-[#1A1A1A] mb-3">
                <span suppressHydrationWarning>{formatRupiah(menu.price)}</span>
              </p>
              {qty === 0 ? (
                <button
                  id={`btn-add-${menu.id}`}
                  onClick={() => addToCart(menu)}
                  className="w-full py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-xl hover:bg-[#333] active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 inline-block mr-1" /> Tambah
                </button>
              ) : (
                <div className="flex items-center justify-between bg-[#F5F2EB] rounded-xl p-1">
                  <button id={`btn-remove-${menu.id}`} onClick={() => removeFromCart(menu.id)} className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] font-bold text-base hover:bg-white rounded-lg transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-[#1A1A1A] min-w-[1.5rem] text-center">{qty}</span>
                  <button id={`btn-add-${menu.id}`} onClick={() => addToCart(menu)} className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center text-white font-bold text-base rounded-lg hover:bg-[#333] transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
