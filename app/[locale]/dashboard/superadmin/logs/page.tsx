'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { RefreshCw, Activity, AlertCircle, CheckCircle, Info, Server } from 'lucide-react';

interface WebsiteLog {
  id: string;
  created_at?: string;
  title: string;
  description: string;
  time?: string;
  type: 'system' | 'info' | 'success' | 'alert';
  visitor_ip?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<WebsiteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'system' | 'info' | 'success' | 'alert'>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); 

      if (!error && data) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Gagal mengambil log:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => filter === 'all' || log.type === filter);

  return (
    <div className="bg-slate-50 min-h-screen font-sans">

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

      <div className="bg-white rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 border border-slate-900/5">
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900 hover:bg-gray-200'}`}
          >
            Semua Log
          </button>
          <button 
            onClick={() => setFilter('alert')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${filter === 'alert' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Error & Bug
          </button>
          <button 
            onClick={() => setFilter('success')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${filter === 'success' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Sukses
          </button>
          <button 
            onClick={() => setFilter('info')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${filter === 'info' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
          >
            <Info className="w-3.5 h-3.5" /> Info
          </button>
          <button 
            onClick={() => setFilter('system')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${filter === 'system' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <Server className="w-3.5 h-3.5" /> Sistem
          </button>
        </div>

        <div className="space-y-3">
          {loading && logs.length === 0 ? (
            <div className="text-center py-20 text-slate-900/40 font-medium text-sm">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-20" />
              Memuat data log...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-900/40 font-medium text-sm bg-slate-50 rounded-xl">
              <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
              Tidak ada log yang sesuai filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              let dotColor = 'bg-blue-500';
              let icon = <Server className="w-4 h-4 text-white" />;
              
              if (log.type === 'success') {
                dotColor = 'bg-emerald-500';
                icon = <CheckCircle className="w-4 h-4 text-white" />;
              } else if (log.type === 'alert') {
                dotColor = 'bg-rose-500';
                icon = <AlertCircle className="w-4 h-4 text-white" />;
              } else if (log.type === 'info') {
                dotColor = 'bg-indigo-500';
                icon = <Info className="w-4 h-4 text-white" />;
              }

              return (
                <div key={log.id} className="group bg-slate-50 border border-slate-900/5 rounded-xl p-4 flex gap-4 transition hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 hover:border-slate-900/10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 ${dotColor}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">{log.title}</h3>
                        <p className="text-xs text-slate-900/60 font-mono mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 scrollbar-hide break-words">
                          {log.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-slate-900/40 bg-white px-2 py-1 rounded-lg border border-slate-900/5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 inline-block">
                          {log.time || (log.created_at ? new Date(log.created_at).toLocaleString('id-ID', { hour12: false }) : '-')}
                        </span>
                        {log.visitor_ip && (
                          <span className="text-[9px] font-mono font-bold text-slate-900/30 bg-black/5 px-1.5 py-0.5 rounded">
                            IP: {log.visitor_ip}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
