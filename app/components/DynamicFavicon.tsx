'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState('');

  useEffect(() => {
    const { data } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl('system/favicon.ico');

    if (data?.publicUrl) {
      setFaviconUrl(`${data.publicUrl}?t=${Date.now()}`);
    }
  }, []);

  if (!faviconUrl) return null;

  return (
    <>
      <link rel="icon" href={faviconUrl} type="image/svg+xml" />
      <link rel="shortcut icon" href={faviconUrl} type="image/svg+xml" />
    </>
  );
}
