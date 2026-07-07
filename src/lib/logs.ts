export type LogType = 'system' | 'info' | 'success' | 'alert';

export async function logWebsiteEvent(
  title: string,
  description: string,
  type: LogType = 'info'
) {
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, type }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(body?.error ?? `Failed to save log: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn('[logWebsiteEvent] Gagal mencatat log:', err);
    return null;
  }
}
