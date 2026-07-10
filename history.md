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
## 16. UI Update: Muted Neobrutalism untuk Enterprise
- **Pembaruan:** Mengubah *styling* `app/page.tsx` dari gaya Neobrutalism liar menjadi **Muted Neobrutalism** yang tenang, profesional, dan berkelas korporat (B2B).
- **Desain Baru:** 
  - Palet warna: Putih bersih, `slate-50`, dengan aksen `indigo-600` dan `emerald-600`.
  - Garis batas diperhalus: `border-2 border-slate-900`.
  - Bayangan (*Shadow*): Diubah menggunakan warna navy gelap (`rgba(15,23,42,1)`) agar tidak terlalu memukul mata.
  - Tipografi: Menjadi `font-bold tracking-tight` (tidak lagi *uppercase* brutal) demi kenyamanan membaca (*readability*).
- **Hasil:** Landing page kini memancarkan aura *Enterprise-Grade* dengan tetap mempertahankan elemen struktural modern khas Neobrutalism. Build sukses.
## 17. Massive UI Refactor: Workspace-Wide Muted Neobrutalism
- **Pembaruan:** Melakukan skrip *mass refactor* pada lebih dari 50 file komponen UI (termasuk modul `/dashboard`, `/order`, `/components`, dan halaman autentikasi).
- **Desain Baru:** 
  - Seluruh warna, bayangan (*shadows*), ketebalan garis (*borders*), dan *border-radius* kini dipaksa mengikuti *design tokens* "Muted Neobrutalism" yang ditetapkan di `PROJECT.MD`.
  - Mengubah dominasi hitam/gelap brutal menjadi paduan abu-abu, putih, *indigo*, dan *slate* yang profesional.
- **Hasil:** Seluruh ekosistem QREats kini memiliki konsistensi bahasa desain kelas *enterprise*. Kompilasi build berjalan lancar 100%.
## 18. Bug Fix: OneSignal SDK Initialization
- **Perbaikan:** Menghapus `await` yang tidak perlu dan mengoreksi nama properti dari `PushSubscription` (kapital P) menjadi `pushSubscription` (huruf kecil p) pada file `app/components/OneSignalInit.tsx`.
- **Alasan:** Pada OneSignal Web SDK v16, properti `User.pushSubscription` ditulis menggunakan format *camelCase*, dan `optedIn` merupakan properti *boolean*, bukan Promise. Kesalahan ini menyebabkan evaluasi keliru (*undefined*) yang memicu perulangan atau kegagalan *opt-in*.
- **Hasil:** Integrasi *push notification* kembali stabil. Build terkonfirmasi sukses.
## 19. Architecture Upgrade: i18n Auto-Detection
- **Pembaruan:** Mengimplementasikan infrastruktur translasi dan *routing* multi-bahasa menggunakan `next-intl` dengan deteksi lokasi otomatis berbasis *header* `Accept-Language`.
- **Eksekusi:** 
  - Restrukturisasi rute Next.js dari `app/*` menjadi `app/[locale]/*`.
  - Penyesuaian ratusan *import paths* lintas direktori dan pembuatan modul *middleware*.
  - Pembuatan kamus translasi `messages/id.json` (Bahasa Indonesia - *default*) dan `messages/en.json` (Bahasa Inggris).
- **Hasil:** Aplikasi sekarang mendukung pergantian bahasa otomatis tanpa mengubah logika domain secara drastis. Struktur siap untuk translasi massal secara bertahap pada *sprint* berikutnya.
## 20. Bug Fix & i18n Audit
- **Pembaruan:** Memperbaiki *bug crash* OneSignal yang muncul di domain selain localhost/produksi.
- **Eksekusi:** 
  - Mengubah logika validasi domain di `OneSignalInit.tsx` dan `dashboard/kasir/page.tsx`. Inisialisasi SDK sekarang melakukan *silent return* jika domain tidak diizinkan.
  - Melakukan *Workspace-Wide Audit* pada folder `app/[locale]/` untuk memverifikasi keutuhan arsitektur i18n paska-restrukturisasi.
- **Hasil:** Aplikasi tidak lagi mengalami error saat diakses di domain Vercel sementara. Sistem *build* (Next.js) terkonfirmasi berjalan tanpa hambatan (0 *errors*).
## 21. Absolute Short-Circuit for OneSignal
- **Pembaruan:** Menerapkan proteksi mutlak pada inisialisasi OneSignal.
- **Eksekusi:** Mengubah struktur `OneSignalInit.tsx` dengan menambahkan `useState` dan `useEffect` untuk melakukan validasi domain di sisi klien. Jika domain tidak cocok, komponen merender `null` (short-circuit), mencegah pemuatan `Script` tag dan interaksi DOM tak diizinkan sama sekali.
