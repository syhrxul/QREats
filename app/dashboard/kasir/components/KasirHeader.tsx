'use client';

import React from 'react';
import { BellIcon, SoundIcon } from '../../../components/Icons';

interface Props {
  shopName: string;
  pendingCount: number;
  soundEnabled: boolean;
  onToggleSound: (v: boolean) => void;
  onEnableNotifications: () => void;
}

export default function KasirHeader({ shopName, pendingCount, soundEnabled, onToggleSound, onEnableNotifications }: Props) {
  return (
    <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
      <div>
        <h2 className="text-lg font-black text-[#1A1A1A]">Daftar Antrean Order {shopName && `· ${shopName}`}</h2>
        <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Realtime monitoring pesanan meja</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggleSound(!soundEnabled)}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${soundEnabled ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
          <SoundIcon className="w-4 h-4" />
          <span>{soundEnabled ? 'Suara: Aktif' : 'Suara: Mati'}</span>
        </button>
        {pendingCount > 0 && (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full">{pendingCount} PENDING</span>
        )}
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span>Live Monitor</span>
        </div>
      </div>
    </div>
  );
}
