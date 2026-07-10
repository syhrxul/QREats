'use client';

import { useEffect, useRef } from 'react';
import { logWebsiteEvent } from '@/src/lib/logs';

export default function GlobalLogger() {
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;

    // 1. Tangkap Uncaught Exceptions (Syntax errors, undefined is not a function, dll)
    const handleError = (event: ErrorEvent) => {
      const { message, filename, lineno, colno, error } = event;
      const stack = error?.stack || 'No stack trace';
      
      const description = `File: ${filename}\nLine: ${lineno}:${colno}\n\nStack:\n${stack}`;
      
      // Jangan await, biarkan berjalan asinkron di background
      void logWebsiteEvent(
        `JS Error: ${message}`,
        description.substring(0, 500), // Batasi panjang deskripsi agar tidak terlalu besar
        'alert'
      );
    };

    // 2. Tangkap Unhandled Promise Rejections (API gagal, fetch gagal, dll)
    const handleRejection = (event: PromiseRejectionEvent) => {
      let message = 'Unknown Promise Rejection';
      let description = '';

      if (event.reason instanceof Error) {
        message = event.reason.message;
        description = event.reason.stack || 'No stack trace';
      } else if (typeof event.reason === 'string') {
        message = event.reason;
      } else {
        message = JSON.stringify(event.reason);
      }

      void logWebsiteEvent(
        `Promise Rejection: ${message}`,
        description.substring(0, 500),
        'alert'
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // 3. (Opsional) Tangkap Slow Performance / Long Tasks jika didukung browser
    let observer: PerformanceObserver | null = null;
    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Jika ada task yang memakan waktu lebih dari 1000ms (1 detik)
            if (entry.duration > 1000) {
              void logWebsiteEvent(
                'Performance Warning (Long Task)',
                `Task memakan waktu ${Math.round(entry.duration)}ms. Tipe: ${entry.entryType}, Nama: ${entry.name}`,
                'alert'
              );
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Beberapa browser mungkin tidak mendukung longtask
      }
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      if (observer) observer.disconnect();
    };
  }, []);

  // Komponen ini tidak me-render apapun ke UI
  return null;
}
