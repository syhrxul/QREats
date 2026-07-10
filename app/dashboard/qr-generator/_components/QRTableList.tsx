import React from 'react';
import { TableDB } from './QRCanvasUtils';
import { TrashIcon, PlayIcon, PauseIcon, EditIcon } from '../../../components/Icons';

export function QRTableList({
  tables,
  maxTables,
  addingMode,
  setAddingMode,
  newTableName,
  setNewTableName,
  bulkPrefix,
  setBulkPrefix,
  bulkQuantity,
  setBulkQuantity,
  handleAddTable,
  handleAddBulkTables,
  generating,
  handleToggleTableActive,
  handleDeleteTable,
  editingTable,
  setEditingTable,
  editName,
  setEditName,
  handleSaveEdit
}: any) {
  return (
    <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-6 mb-8 print:hidden">
      <h2 className="font-semibold text-[#1A1A1A] mb-1">Kelola & Tambah Meja</h2>
      <p className="text-xs text-[#1A1A1A]/40 mb-4">
        Pilih mode penambahan meja: satu per satu atau generate secara massal.
      </p>

      <div className="grid grid-cols-2 gap-2 bg-[#F5F2EB] p-1 rounded-xl mb-4 max-w-xs">
        <button
          type="button"
          onClick={() => setAddingMode('single')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
            addingMode === 'single' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
          }`}
        >
          ➕ Tambah Satu
        </button>
        <button
          type="button"
          onClick={() => setAddingMode('bulk')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
            addingMode === 'bulk' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
          }`}
        >
          📦 Bulk Generate
        </button>
      </div>

      {addingMode === 'single' ? (
        <div className="flex gap-2 w-full max-w-md">
          <input
            type="text"
            placeholder="Nama Meja (Contoh: VIP-01)"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            className="flex-1 bg-[#F5F2EB] border-transparent rounded-xl px-4 py-2 text-sm focus:border-[#1A1A1A]/20 focus:ring-0 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTable();
            }}
          />
          <button
            onClick={handleAddTable}
            disabled={generating || !newTableName.trim()}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {generating ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-2xl">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider mb-1">Prefix Nama</label>
            <input
              type="text"
              placeholder="Contoh: Meja"
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
              className="w-full bg-[#F5F2EB] border-transparent rounded-xl px-4 py-2 text-sm focus:border-[#1A1A1A]/20 focus:ring-0 outline-none"
            />
          </div>
          <div className="w-full sm:w-24">
            <label className="block text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider mb-1">Jumlah</label>
            <input
              type="number"
              min="1"
              max="100"
              value={bulkQuantity}
              onChange={(e) => setBulkQuantity(Number(e.target.value))}
              className="w-full bg-[#F5F2EB] border-transparent rounded-xl px-4 py-2 text-sm focus:border-[#1A1A1A]/20 focus:ring-0 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddBulkTables}
              disabled={generating || !bulkPrefix.trim() || bulkQuantity < 1}
              className="w-full sm:w-auto h-[36px] px-6 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {generating ? 'Memproses...' : 'Generate Massal'}
            </button>
          </div>
        </div>
      )}

      {/* Tabel Data List */}
      {tables.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-[#1A1A1A]/8">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F5F2EB] text-[#1A1A1A]/60 font-semibold">
              <tr>
                <th className="px-4 py-3">Nama Meja</th>
                <th className="px-4 py-3">Token UUID</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/5">
              {tables.map((t: any) => (
                <tr key={t.id} className="hover:bg-[#1A1A1A]/[0.02] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                    {editingTable?.id === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white border border-[#1A1A1A]/20 rounded-lg px-2 py-1 text-sm outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        />
                        <button onClick={handleSaveEdit} className="text-xs font-bold text-green-600 hover:text-green-700">Simpan</button>
                        <button onClick={() => setEditingTable(null)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Batal</button>
                      </div>
                    ) : (
                      t.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#1A1A1A]/40">{t.token}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <button
                      title="Edit Nama"
                      onClick={() => {
                        setEditingTable(t);
                        setEditName(t.name);
                      }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      title={t.is_active ? "Nonaktifkan Meja" : "Aktifkan Meja"}
                      onClick={() => handleToggleTableActive(t)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        t.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'
                      }`}
                    >
                      {t.is_active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    </button>
                    <button
                      title="Hapus Meja"
                      onClick={() => handleDeleteTable(t)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
