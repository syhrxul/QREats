'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico');

  useEffect(() => {
    const { data } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl('system/favicon.ico');

    if (data?.publicUrl) {
      const img = new Image();
      img.onload = () => {
        setFaviconUrl(`${data.publicUrl}?t=${Date.now()}`);
      };
      img.onerror = () => {
        setFaviconUrl('/favicon.ico');
      };
      img.src = data.publicUrl;
    }
  }, []);

  return <link rel="icon" href={faviconUrl} sizes="any" />;
}
