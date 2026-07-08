'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import Link from 'next/link';
import { LockIcon } from '../../../components/Icons';

interface TableSizeInfo {
  table_name: string;
  total_size: string;
  row_count: number;
}

interface DbMetrics {
  database_size: string;
  active_connections: number;
  table_sizes: TableSizeInfo[];
}

/**
 * Halaman Khusus Superadmin untuk Pemantauan Performa & Kesehatan Database Supabase.
 * Berdiri sendiri untuk menjaga modulitas kode tetap bersih dan di bawah 200 baris.
 */
export default function DatabaseMonitorPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [dbMetrics, setDbMetrics] = useState<DbMetrics | null>(null);
  const [rpcSupported, setRpcSupported] = useState<boolean | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Cek Hak Akses Superadmin
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'superadmin') {
        setAccessDenied(true);
      }
      setAuthChecking(false);
    }
    checkAccess();
  }, []);

  // Ambil Metrik Database
  const fetchDbMetrics = async () => {
    setLoadingDb(true);
    try {
      const { data, error } = await supabase.rpc('get_db_metrics');
      if (error) {
        setRpcSupported(false);
      } else {
        setDbMetrics(data);
        setRpcSupported(true);
      }
    } catch (err) {
      setRpcSupported(false);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    if (!authChecking && !accessDenied) {
      fetchDbMetrics();
    }
  }, [authChecking, accessDenied]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/40">Memeriksa hak akses superadmin...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="block mb-4"><LockIcon className="w-12 h-12 text-[#1A1A1A] mx-auto" /></span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-[#1A1A1A]/50">Halaman ini khusus untuk Superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/superadmin" className="px-3 py-1.5 border border-[#1A1A1A]/15 hover:bg-[#1A1A1A]/5 text-xs font-bold rounded-xl transition-all">
            Kembali
          </Link>
          <div>
            <h2 className="text-lg font-black text-[#1A1A1A]">Performa Database Supabase</h2>
            <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Pemantauan kapasitas penyimpanan, koneksi aktif, dan ukuran tabel utama.</p>
          </div>
        </div>
        <button
          onClick={fetchDbMetrics}
          className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {loadingDb ? (
          <div className="py-20 text-center text-xs text-[#1A1A1A]/40 animate-pulse font-sans bg-white border border-[#1A1A1A]/8 rounded-3xl">
            Memuat metrik kesehatan database...
          </div>
        ) : rpcSupported ? (
          <div className="space-y-6">
            {/* Metrik Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Penyimpanan Terpakai</span>
                  <p className="text-3xl font-black text-[#1A1A1A] mt-1">{dbMetrics?.database_size || '...'}</p>
                </div>
                <div className="w-12 h-12 bg-[#F5F2EB] rounded-2xl flex items-center justify-center text-[#1A1A1A]/40 font-bold text-xs">
                  Disk
                </div>
              </div>

              <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Koneksi Database Aktif</span>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{dbMetrics?.active_connections || 0}</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Live
                </div>
              </div>
            </div>

            {/* Tabel Ukuran Tabel */}
            <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">Ukuran Data per Tabel Utama</h3>
                <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftar tabel public dengan baris data & ukuran penyimpanan terbesar</p>
              </div>
              <div className="border border-[#1A1A1A]/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F2EB]/60 border-b border-[#1A1A1A]/5 font-bold text-[#1A1A1A]/60">
                      <th className="p-3">Nama Tabel</th>
                      <th className="p-3">Ukuran Disk</th>
                      <th className="p-3">Total Baris</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbMetrics?.table_sizes?.map((t, idx) => (
                      <tr key={idx} className="border-b border-[#1A1A1A]/5 hover:bg-[#F5F2EB]/10 transition-colors">
                        <td className="p-3 font-mono text-[#1A1A1A]">{t.table_name}</td>
                        <td className="p-3 text-[#1A1A1A]/70">{t.total_size}</td>
                        <td className="p-3 font-semibold text-[#1A1A1A]">{t.row_count.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-[#1A1A1A] text-sm">Aktivasi Metrik Performa</h3>
              <p className="text-xs text-[#1A1A1A]/50 leading-relaxed">
                Skrip SQL berikut dibutuhkan untuk membaca data kapasitas database secara aman. Salin kode di bawah ini lalu jalankan di **SQL Editor** Supabase Anda.
              </p>
            </div>
            <div className="relative">
              <pre className="bg-[#1A1A1A] text-white/90 text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-[200px] leading-relaxed">
{`CREATE OR REPLACE FUNCTION get_db_metrics()
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
    db_size text;
    active_conn int;
    table_sizes json;
BEGIN
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
    SELECT count(*) INTO active_conn FROM pg_stat_activity;
    SELECT json_agg(t) INTO table_sizes
    FROM (
        SELECT relname AS table_name, 
               pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
               n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 5
    ) t;
    RETURN json_build_object(
        'database_size', db_size,
        'active_connections', active_conn,
        'table_sizes', table_sizes
    );
END;
$$ LANGUAGE plpgsql;`}
              </pre>
              <button
                onClick={() => {
                  const sql = `CREATE OR REPLACE FUNCTION get_db_metrics()
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
    db_size text;
    active_conn int;
    table_sizes json;
BEGIN
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
    SELECT count(*) INTO active_conn FROM pg_stat_activity;
    SELECT json_agg(t) INTO table_sizes
    FROM (
        SELECT relname AS table_name, 
               pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
               n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 5
    ) t;
    RETURN json_build_object(
        'database_size', db_size,
        'active_connections', active_conn,
        'table_sizes', table_sizes
    );
END;
$$ LANGUAGE plpgsql;`;
                  navigator.clipboard.writeText(sql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#1A1A1A] font-bold text-[10px] rounded-lg shadow transition-all cursor-pointer"
              >
                {copiedSql ? 'Tersalin!' : 'Salin SQL'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
