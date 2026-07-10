## 13. Integrasi Analytics (Vercel)
- **Instalasi Paket:** Menambahkan dependensi `@vercel/analytics` untuk melacak kunjungan dan interaksi pengguna.
- **Injeksi Komponen:** Menyuntikkan komponen `<Analytics />` secara global ke dalam struktur utama `app/layout.tsx`.
- **Visibilitas Metrik:** *Owner* kini dapat melihat wawasan trafik dan data pengunjung secara *real-time* langsung di *dashboard* Vercel tanpa perlu setup pihak ketiga tambahan.
## 14. Refactoring & Ponytail Protocol
- **Refactoring:** Menghapus div soup dan memotong kode secara ekstensif pada `qr-generator/page.tsx`, `menus/page.tsx`, dan `feedbacks/page.tsx` berdasarkan filosofi *Ponytail Protocol*.
- **Komponen Ekstrak:** 
  - `QRTemplates`, `QRTableList`, dan `QRCanvasUtils` dipindahkan ke `qr-generator/_components`.
  - `AIMagicImportModal` dan `MenuEditorModal` dipindahkan ke `menus/_components`.
  - `FeedbackComposeModal` dipindahkan ke `feedbacks/_components`.
- **Hasil:** Berhasil mengurangi ukuran file-file utama hingga 75%, menjadikan kode lebih *boring*, ringkas, dan mudah untuk *di-maintain*. Build berjalan sukses tanpa *type error*.
## 15. UI Overhaul: Landing Page Neobrutalism
- **Refactoring:** Menulis ulang komponen utama `app/page.tsx` dari awal untuk menerapkan gaya desain *Neobrutalism* sesuai dengan _visual tokens_ di `PROJECT.MD`.
- **Desain Baru:** 
  - Mengubah warna menjadi sangat vibran (`#FFE400`, `#00E676`, `#FF4911`).
  - Mengubah garis pembatas (*border*) menjadi sangat tebal (`border-4 border-black`).
  - Mengganti bayangan *blur* yang lembut dengan bayangan solid dan *harsh* (`shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`).
  - Menerapkan tipografi kapital, tebal ekstrem (`font-black uppercase tracking-tight`), dan efek *hover* yang tajam dan taktis (*rigid*).
- **Hasil:** Halaman *landing page* kini tampil jauh lebih berani, modern, menonjol (*stand out*), tanpa *error build*.
