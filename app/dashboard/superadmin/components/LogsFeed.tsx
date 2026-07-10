'use client';

import React from 'react';

export interface WebsiteLog {
  id: string;
  created_at?: string;
  title: string;
  description: string;
  time?: string;
  type: 'system' | 'info' | 'success' | 'alert';
  visitor_ip?: string;
}

interface Props {
  liveLogs: WebsiteLog[];
}

export default function LogsFeed({ liveLogs }: Props) {
  return (
    <div className="bg-slate-900 text-white rounded-xl p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex flex-col justify-between min-h-[380px]">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Log Website</h3>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            Live Feed
          </span>
        </div>
        <p className="text-xs text-white/50 mt-0.5">Arus log aktivitas dan transaksi platform secara langsung</p>
      </div>

      <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1 mt-4">
        {liveLogs.length === 0 ? (
          <div className="text-center py-20 text-white/20 text-xs">Menunggu log aktivitas baru...</div>
        ) : (
          liveLogs.map((log, idx) => {
            let dotColor = 'bg-blue-500';
            if (log.type === 'success') dotColor = 'bg-emerald-500';
            if (log.type === 'info') dotColor = 'bg-indigo-500';
            if (log.type === 'alert') dotColor = 'bg-amber-500';

            return (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs transition-all hover:bg-white/10 animate-fade-in">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                  <div className="min-w-0">
                    <p className="font-bold text-white leading-tight">{log.title}</p>
                    <p className="text-[10px] text-white/50 mt-1 flex flex-wrap items-center gap-1.5 font-sans">
                      <span className="truncate" title={log.description}>{log.description}</span>
                      {log.visitor_ip && (
                        <span className="bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-mono text-[8px] flex-shrink-0">IP: {log.visitor_ip}</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-white/40 ml-4 flex-shrink-0">{log.time || new Date((log as any).created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
