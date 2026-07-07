'use client';

import Script from 'next/script';

/**
 * Komponen Client untuk menginisialisasi OneSignal Web SDK secara global
 * menggunakan CDN script bawaan dan konfigurasi custom.
 * Dilengkapi dengan pengaman asal aman (HTTPS / localhost) agar tidak crash.
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
            // Cek apakah origin aman (HTTPS atau localhost) sebelum inisialisasi
            const isSecure = 
              typeof window !== 'undefined' && 
              (window.location.protocol === 'https:' || 
               window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1');

            if (!isSecure) {
              console.warn('OneSignal Web SDK dinonaktifkan karena origin tidak aman (HTTP bukan localhost).');
              return;
            }

            try {
              await OneSignal.init({
                appId: "a819b278-917e-4f10-b122-e148ba98f6ce",
                safari_web_id: "web.onesignal.auto.3cfe9839-ceab-4809-9212-172318dbfb2e",
                notifyButton: {
                  enable: true,
                },
                allowLocalhostAsSecureOrigin: true,
              });
              console.log('OneSignal SDK berhasil diinisialisasi via script.');
            } catch (err) {
              console.warn('Gagal memproses inisialisasi OneSignal:', err);
            }
          });
        }}
      />
    </>
  );
}
