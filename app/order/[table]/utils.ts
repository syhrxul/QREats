export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp\u00A0${thousands}`;
}
