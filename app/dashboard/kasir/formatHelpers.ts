/**
 * Memformat nominal angka menjadi string mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp\u00A0${thousands}`;
}

/**
 * Memformat ISO string menjadi format jam HH:MM
 */
export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '--:--';
  }
}

/**
 * Menghasilkan label tanggal bersahabat (Hari Ini, Kemarin, dll)
 */
export function getFriendlyDateLabel(dateString: string): string {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari Ini - ' + date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin - ' + date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {
    return dateString;
  }
}
