const quantityFormat = new Intl.NumberFormat('es-CL');
const currencyFormat = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function finiteValue(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatInventoryQuantity(value: unknown): string {
  const parsed = finiteValue(value);
  return parsed === null ? '—' : quantityFormat.format(parsed);
}

export function formatInventoryMoney(value: unknown): string {
  const parsed = finiteValue(value);
  return parsed === null ? '—' : currencyFormat.format(parsed);
}

export function inventoryStatusHref(search: string, status: string): string {
  const params = new URLSearchParams(search);
  params.delete('dataHealth');
  if (status === 'all') params.delete('status');
  else params.set('status', status);
  const query = params.toString();
  return `/dashboard/bodega${query ? `?${query}` : ''}`;
}
