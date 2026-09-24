// Deterministic identity-evidence helpers for maintenance asset views.
// These normalizers and classifiers never invent data: they only clean,
// normalize or classify evidence that already exists in canonical sources.

export function normalizeAssetIdentity(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\b(SONDA|EQUIPO|MAQUINA|MÁQUINA)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, '')
    .trim();
}

export function normalizeLocationEvidence(value: unknown) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/^MINA\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || ['#ERROR!', 'NO REGISTRADO', 'N/A', 'SIN MINA ASIGNADA', 'SIN ASIGNAR', 'NO ASIGNADO'].includes(normalized)) {
    return '';
  }
  return normalized;
}

export function cleanCategoricalEvidence(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (['#ERROR!', 'NO REGISTRADO', 'N/A', 'SIN ASIGNAR', 'NO ASIGNADO', 'DESCONOCIDO'].includes(normalized)) {
    return '';
  }
  return raw;
}

export function normalizeCriticalityEvidence(value: unknown) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  if (['alta', 'high'].includes(normalized)) return 'high';
  if (['media', 'medium'].includes(normalized)) return 'medium';
  if (['baja', 'low'].includes(normalized)) return 'low';
  if (['critica', 'critical'].includes(normalized)) return 'critical';
  return normalized || '';
}

export function inferManufacturerFromName(value: unknown) {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

  const brands: Array<[RegExp, string]> = [
    [/\bATLAS COPCO\b/, 'Atlas Copco'],
    [/\bCATERPILLAR\b/, 'Caterpillar'],
    [/\bCAT\b/, 'Caterpillar'],
    [/\bTOYOTA\b/, 'Toyota'],
    [/\bWEICHAI\b/, 'Weichai'],
    [/\bWILSON\b/, 'Wilson'],
    [/\bVOLKSWAGEN\b/, 'Volkswagen'],
    [/\bFORD\b/, 'Ford'],
    [/\bNISSAN\b/, 'Nissan'],
    [/\bMITSUBISHI\b/, 'Mitsubishi'],
    [/\bCHEVROLET\b/, 'Chevrolet'],
    [/\bDOOSAN\b/, 'Doosan'],
    [/\bSULLAIR\b/, 'Sullair'],
    [/\bJCB\b/, 'JCB'],
    [/\bPOSITRON\b/, 'Positron'],
    [/\bINGETROL\b/, 'Ingetrol'],
    [/\bSANDVIK\b/, 'Sandvik'],
    [/\bEPIROC\b/, 'Epiroc'],
    [/\bPAUS\b/, 'Paus'],
    [/\bXCMG\b/, 'XCMG'],
    [/\bMANITOU\b/, 'Manitou'],
  ];

  return brands.find(([pattern]) => pattern.test(raw))?.[1] || null;
}

export function inferChileanPlateFromName(value: unknown) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/(?:^|[\s-])([A-Z]{4}-[0-9]{2}|[A-Z]{2}-[0-9]{4})$/);
  return match?.[1] || null;
}

export function isRoadVehicleIdentity(...values: unknown[]) {
  const normalized = values
    .map((value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase(),
    )
    .join(' ');
  return /\b(CAMIONETA|CAMIONETAS|CAMION|CAMIONES|BUS|BUSES|FURGON|VEHICULO|VEHICLE|TRUCK|PICKUP)\b/.test(normalized);
}
