'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Komponen inisialisasi OneSignal Web SDK v16.
 * Dilengkapi dengan proteksi short-circuit mutlak: Script SDK tidak akan pernah
 * dimuat atau dirender ke DOM jika bukan dari domain yang diizinkan.
 */
export default function OneSignalInit() {
  const [isAllowedDomain, setIsAllowedDomain] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const allowed = hostname === 'qr-eats-umber.vercel.app';
    if (allowed) {
      setIsAllowedDomain(true);
    }
  }, []);

  // Proteksi mutlak (short-circuit)
  if (!isAllowedDomain) {
    return null;
  }

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      defer
      onLoad={() => {
        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            await OneSignal.init({
              appId: 'a819b278-917e-4f10-b122-e148ba98f6ce',
              safari_web_id: 'web.onesignal.auto.3cfe9839-ceab-4809-9212-172318dbfb2e',
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerParam: { scope: '/' },
              notifyButton: { enable: false },
            });

            if (OneSignal.Notifications && OneSignal.Notifications.permission) {
              const isSubscribed = OneSignal.User?.pushSubscription?.optedIn;
              if (!isSubscribed) {
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
  );
}
