'use client';

import Script from 'next/script';

/**
 * Komponen inisialisasi OneSignal Web SDK v16.
 * Mendukung notifikasi latar belakang (background push) via Service Worker.
 * Kasir cukup sekali klik "Izinkan" dan notifikasi akan masuk meski tab ditutup.
 */
export default function OneSignalInit() {
  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        defer
        onLoad={() => {
          (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
          (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
            const isSecure =
              typeof window !== 'undefined' &&
              (window.location.protocol === 'https:' ||
               window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1');

            if (!isSecure) {
              console.warn('OneSignal dinonaktifkan: origin tidak aman (gunakan HTTPS atau localhost).');
              return;
            }

            try {
              await OneSignal.init({
                appId: 'a819b278-917e-4f10-b122-e148ba98f6ce',
                safari_web_id: 'web.onesignal.auto.3cfe9839-ceab-4809-9212-172318dbfb2e',
                allowLocalhostAsSecureOrigin: true,

                // Pastikan Service Worker terdaftar di root scope "/"
                // agar notifikasi background bisa masuk dari seluruh halaman
                serviceWorkerParam: { scope: '/' },

                // Sembunyikan tombol bell bawaan OneSignal (kita pakai tombol custom di kasir)
                notifyButton: { enable: false },
              });

              // Setelah init, jika browser SUDAH mengizinkan notifikasi sebelumnya,
              // langsung pastikan device ini ter-subscribe ke push server OneSignal.
              // Ini kunci agar notifikasi background bisa diterima meski tab ditutup.
              if (OneSignal.Notifications && OneSignal.Notifications.permission) {
                const isSubscribed = OneSignal.User?.pushSubscription?.optedIn;
                if (!isSubscribed) {
                  // Subscribe ulang jika entah kenapa subscripsi terputus
                  await OneSignal.Notifications.requestPermission();
                }
              }

              console.log('OneSignal SDK berhasil diinisialisasi (background push aktif).');
            } catch (err) {
              console.warn('Gagal menginisialisasi OneSignal:', err);
            }
          });
        }}
      />
    </>
  );
}
