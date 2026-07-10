'use client';

import React from 'react';

interface StatItem {
  label: string;
  value: string;
  color: string;
}

interface BestSeller {
  name: string;
  count: number;
  percent: number;
}

interface AnalyticsTabProps {
  stats: StatItem[];
  bestSellers: BestSeller[];
}

/**
 * Tab panel untuk analisis kinerja toko dalam mode demo (tanpa emoji)
 */
export default function AnalyticsTab({ stats, bestSellers }: AnalyticsTabProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="border-b border-slate-900/10 px-2 py-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">Analisis &amp; Laporan</h2>
        <p className="text-xs text-slate-900/40 mt-0.5">Ringkasan kinerja toko (simulasi)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-900/8 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-900/8 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Menu Terlaris Hari Ini</h3>
        <div className="space-y-3">
          {bestSellers.map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-900/40 w-5">{i + 1}.</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                  <span className="text-xs font-bold text-slate-900/60">{item.count} terjual</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
