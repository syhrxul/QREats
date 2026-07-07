import { createClient } from '@supabase/supabase-js';

export type ServerLogType = 'system' | 'info' | 'success' | 'alert';

export async function logWebsiteEventServer(
  title: string,
  description: string,
  type: ServerLogType = 'system',
  visitorIp: string | null = null
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diatur.');
  }

  const db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await db.from('website_logs').insert([
    {
      title,
      description,
      type,
      visitor_ip: visitorIp,
    },
  ]);
}
