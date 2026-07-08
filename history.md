# Riwayat Perubahan dan Optimasi (QREats)

Dokumen ini mencatat seluruh perubahan struktural, refaktor kode, dan penyesuaian fungsionalitas yang telah dilakukan sesuai dengan mandat dan konstitusi pada `AGENTS.md`.

## 1. Pembaruan Aturan & Konstitusi Agen AI
- **File:** `AGENTS.md`
- **Deskripsi:** 
  - Menambahkan aturan ketat terkait redesain anti-AI (desain premium, transisi halus, spasi elegan).
  - Menambahkan larangan mutlak penggunaan emoji sistem (seperti ❌, ✅, 🚀) di seluruh UI dan menggantinya wajib dengan ikon dari pustaka `lucide-react`.
  - Menambahkan aturan aksesibilitas (kontras warna yang baik jika background putih).
  - Melarang penggunaan fungsi UI primitif bawaan *browser* seperti `alert()`, `confirm()`, atau `prompt()`, dan menggantinya dengan komponen buatan sendiri seperti `useToast` atau *Modal*.

## 2. Refaktor Besar Halaman Order Utama (`app/order/[table]`)
Halaman pesanan utama (`page.tsx`) sebelumnya membengkak hingga **1.048 baris kode**. Halaman tersebut kini telah disederhanakan menjadi kurang dari 400 baris dengan memisahkan antarmuka (UI) dan logika (*business logic*) menjadi komponen-komponen terpisah, sesuai dengan prinsip *Clean Code* dan *Separation of Concerns*.

### A. Komponen UI Baru (Folder `_components/`)
1. **`MenuGrid.tsx`**: Menangani seluruh antarmuka untuk merender grid daftar menu makanan/minuman yang tersedia, berikut integrasi tombol tambah/kurang keranjang.
2. **`CartDrawer.tsx`**: Komponen laci (*drawer*) keranjang belanja interaktif yang muncul dari bawah layar, berisi detail pesanan, total harga, dan form data pembeli (Nama, Email, Telepon).
3. **`PaymentModal.tsx`**: Menangani antarmuka saat pesanan berhasil, memunculkan modal QRIS, serta menampung logika *upload* bukti transfer.

### B. Custom Hooks Baru (Folder `_hooks/`)
1. **`useCart.ts`**: Menangani state lokal keranjang belanja, termasuk fungsi `addToCart`, `removeFromCart`, `getQty`, serta kalkulasi total harga dan total *item*.
2. **`useOrder.ts`**: Menangani pengiriman data pesanan (*checkout*) ke *database* Supabase, penanganan notifikasi *push* (OneSignal), dan logika *upload* bukti bayar.

### C. Utilitas & Tipe Data
1. **`types.ts`**: Menyimpan semua *interface* TypeScript yang relevan (seperti `MenuItem`, `CartItem`) agar tidak ada dependensi *circular* pada file komponen.
2. **`utils.ts`**: Menyimpan fungsi pembantu (*helper*), seperti `formatRupiah` untuk memastikan tampilan harga selaras di seluruh aplikasi.

### D. File Inti Halaman (`page.tsx`)
- Menggabungkan semua komponen di atas secara rapi.
- Pembersihan semua emoji lama (contoh: 🍽️, 🧾, 📭) dan digantikan secara menyeluruh dengan ikon profesional SVG dari `lucide-react` (`Coffee`, `AlertCircle`, `CheckCircle`, dll).
- Penerapan tema kustom `#F5F2EB` dan teks tajam `#1A1A1A` tanpa menyebabkan masalah aksesibilitas teks tak terlihat.
- Penghapusan penggunaan `alert()` saat input belum terisi lengkap (menggunakan komponen kustom `ToastContainer`).

## 3. Perbaikan Bug & Integrasi Sistem Lain
- **Penyesuaian `useToast.ts` & `Toast.tsx`:** Mengubah komponen notifikasi *toast* untuk mendukung fungsi `removeToast`, sehingga menghilangkan peringatan/bug ketika notifikasi disembunyikan.
- **Perbaikan Impor Ikon di Kasir:** Menyelesaikan bug gagal kompilasi (*compile error*) pada `app/demo/kasir/page.tsx` dengan menambahkan *import* `Camera` dari `lucide-react`.

## 4. Implementasi Sistem Log Global & Pemindahan Halaman Log
- **Global Logger (`app/components/GlobalLogger.tsx`):**
  - Mengimplementasikan penangkapan *error* secara diam-diam di sisi klien (Client-Side) menggunakan `window.addEventListener('error')` dan `unhandledrejection`.
  - Menggunakan `PerformanceObserver` untuk mencatat aktivitas navigasi atau rendering lambat (> 1000ms).
  - Melakukan *inject* `<GlobalLogger />` ke dalam root `app/layout.tsx` sehingga aktif di seluruh aplikasi.
- **Halaman Khusus Log Aktivitas:**
  - Memindahkan *widget* `LogsFeed` yang sebelumnya sempit di `app/dashboard/superadmin/page.tsx` menjadi halaman layar penuh terdedikasi di `app/dashboard/superadmin/logs/page.tsx`.
  - Menambahkan kapabilitas saringan (*filter*) log berdasarkan kategori (Info, Sistem, Error, Sukses).
- **Pembaruan Navigasi:**
  - Menambahkan menu "Log Aktivitas" pada komponen `Sidebar.tsx` dan `MobileSidebar.tsx`.

## 5. Perbaikan Estetika, Aksesibilitas, dan Indikator Cerdas
- **Aksesibilitas Warna (Kelola Pengguna):**
  - Memperbaiki masalah kontras warna (*white-on-white*) pada kolom *input* form pendaftaran dan pengeditan pengguna di halaman `app/dashboard/superadmin/users/page.tsx`. Menambahkan utilitas kelas `text-[#1A1A1A]` agar font terbaca jelas di atas latar belakang terang.
- **Indikator Cerdas Masa Aktif Lisensi (Daftar Merchant):**
  - Menambahkan penghitung waktu mundur sisa lisensi toko otomatis di `app/dashboard/superadmin/shops/page.tsx`.
  - Jika tenggat waktu tersisa 2 hari atau kurang (H-2, H-1, Hari Ini), teks masa berlaku berubah menjadi warna *amber* dan muncul lencana peringatan ("H-2", dsb).
  - Jika lisensi sudah melewati batas waktu, teks berubah menjadi merah dan muncul lencana "HABIS".

## 6. Perbaikan Landing Page & Crash Login
- **Landing Page:** Menambahkan kembali tombol "Masuk Staf" yang sempat hilang di section Hero utama agar user tidak kebingungan mencari tombol login.
- **Login Crash (Dashboard Layout):** Memperbaiki bug "ga bisa login" yang disebabkan oleh *runtime crash* saat me-render `Sidebar` dan `MobileSidebar`. Atribut `roles` yang terhapus secara tidak sengaja pada menu "Riwayat Transaksi" dan "Profil" telah dikembalikan.
- **Perbaikan Race Condition Login:** Mengubah metode navigasi dari `router.push` ke navigasi paksa (`window.location.href`) di halaman `/login` dan `/register` agar browser dipaksa merender ulang seluruh komponen dan tidak terjebak dalam *loading state* palsu.

## 7. Pembersihan Emoji & Aksesibilitas Warna Input Lisensi
- **Penghapusan Emoji Ilegal:** Menghapus emoji bawaan OS (⏳ dan 🚨) pada layar blokir *expired* dan banner pesanan *pending*, kemudian menggantinya dengan ikon profesional `Clock` dan `AlertTriangle` dari pustaka `lucide-react`.
- **Visibilitas Warna Form Token Lisensi:** Memperbaiki form input Token Aktivasi pada layar "Masa Aktif Habis" yang sebelumnya teksnya tidak terbaca (transparan/putih) jika OS menggunakan mode gelap. Teks kini dipaksa menggunakan warna hitam pekat `#1A1A1A`.

## 8. Perbaikan Status Pesanan Pembeli (Sinkronisasi Database)
- **Bug Status "Menunggu":** Memperbaiki *bug* krusial pada halaman "Pesanan Saya" (di sisi Pembeli) di mana status pesanan selalu terlihat "Menunggu" meskipun kasir sudah menekan tombol ACC (Lunas) atau Tolak. Hal ini disebabkan ketidakcocokan *string* status; kode mencoba memvalidasi status `lunas` dan `ditolak`, sedangkan isi yang disimpan oleh *database* adalah `paid` dan `rejected`. Sinkronisasi telah disesuaikan agar indikator status kembali responsif dan akurat.

## 9. Perbaikan Form Pembayaran (Total Rp 0)
- **Bug Total Tagihan Rp 0:** Memperbaiki *bug* pada Modal Pembayaran (QRIS) di mana nominal tagihan yang tertera adalah "Rp 0". Masalah ini terjadi karena keranjang belanja (`cart`) langsung dikosongkan secara bersamaan saat pesanan berhasil terkirim ke *database*, sehingga status lokal kehilangan nilai `totalPrice` sebelum memunculkan *modal*. Solusi yang diterapkan adalah menyimpan memori (`checkoutTotal`) di dalam `useOrder` sebelum keranjang dibersihkan.

## 10. Fitur Eksklusif: Analisis Lanjutan Paket Pro & Upselling Workflow
- **Paywall & Validasi Paket:** Menambahkan mekanisme pengecekan kolom `subscription_tier` di database untuk menentukan apakah sebuah toko berhak melihat Analisis Lanjutan.
- **Visualisasi Grafik Penjualan Per Jam:** Membuat CSS Bar Chart murni berbasis *Tailwind* untuk melacak puncak keramaian pesanan (`Peak Hours`), mempermudah *owner* menentukan jadwal *shift*.
- **Kinerja Menu:** Memisahkan daftar menu menjadi 3 Bintang Utama (Top Best Sellers) dan Butuh Promosi (Bottom Menus).
- **Metrik Operasional:** Menghitung AOV (*Average Order Value* / Rata-rata Uang Belanja) dan *Success Rate* persentase pesanan lunas.
- **Loyalitas Pelanggan:** Menganalisis *Repeat Order* dalam hari yang sama untuk melacak retensi pelanggan unik.
- **Alur Upselling Otomatis:** Membangun *modal form* bagi *owner* untuk menuliskan alasan pengajuan *upgrade* Paket Pro. Di Dasbor Superadmin, toko pemohon ditandai dengan *badge* "PRO REQ" beserta ulasan alasannya, dengan tombol 1-klik untuk menyetujui *upgrade*.

## 11. Sistem Eskalasi Kritik & Saran
- **Feedback Berjenjang:** Menambahkan fitur pengiriman kritik dan saran baru secara berjenjang. Kasir kini dapat mengirimkan saran langsung ke Owner, sementara Owner dapat mengirim saran/pengaduan langsung ke pusat (Superadmin) melalui tombol "Tulis Saran" di dasbor masing-masing.
- **Anonimitas:** Form kritik dari pembeli maupun staf dibuat anonim secara otomatis jika tidak menyertakan nama, guna menjaga kenyamanan dalam memberikan ulasan objektif.

---
*Dokumen ini dibuat dan terus diperbarui secara otomatis pasca refaktorisasi 1.000+ baris pada sistem pemesanan toko.*

## 12. Fitur Magic Import (AI Menu Digitization)
- **Ekstraksi Otomatis via AI:** Menambahkan integrasi dengan Google Generative AI (Gemini 2.5 Flash) yang memungkinkan *owner* / kasir mengunggah foto atau PDF buku menu fisik. AI akan otomatis mendeteksi nama, harga, deskripsi, dan nama kategori langsung dari gambar tersebut.
- **Tabel Preview Interaktif (Inline Editing):** Setelah AI memproses gambar, sistem menampilkan *preview* dalam bentuk tabel. Seluruh baris di tabel bersifat *editable* sehingga *owner* bisa mengoreksi secara manual setiap teks, harga, dan kategori sebelum menyimpannya ke *database*.
- **Desain UI Premium:** Menghindari elemen generik dengan warna statis, kini UI 'Magic Import' mengadopsi palet elegan (`#F5F2EB`, elemen keemasan dan *border* bersinar halus), serta menghilangkan penggunaan *emoji* bawaan OS (diganti dengan aset `lucide-react` seperti ikon tongkat ajaib `Wand2`, kilauan `Sparkles`, dan kamera `Camera`).
