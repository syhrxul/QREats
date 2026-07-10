'use client';

import React from 'react';

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: string;
}

export default function StatsCard({ title, value, icon, accent = '' }: Props) {
  return (
    <div className="bg-white border border-slate-900/8 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">{title}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
