// Format helpers compartidos por las secciones de la ficha 360 operacional.
// Extraídos de asset-360-overview.tsx para poder reutilizarlos en las
// secciones que se vayan dividiendo del componente.

export const number = (value: unknown, digits = 0) =>
  Number(value).toLocaleString('es-CL', { maximumFractionDigits: digits });

export const money = (value: unknown) =>
  value == null ? 'Sin base' : `$${Number(value).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

export const show = (value: unknown) => {
  if (value == null || String(value).trim() === '') return 'No informado';
  return String(value);
};

export const date = (value: unknown) => {
  if (!value) return 'No informado';
  const raw = String(value);
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(
      new Date(Number(year), Number(month) - 1, Number(day)),
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return show(value);
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(parsed);
};

export const cleanEvidenceText = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const normalized = text.toUpperCase();
  if (['#ERROR!', 'NO REGISTRADO', 'N/A', 'SIN ASIGNAR', 'NO ASIGNADO', 'DESCONOCIDO', '-'].includes(normalized)) return null;
  return text;
};
