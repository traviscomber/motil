import { NextRequest } from 'next/server';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveExecutiveAccess } from '@/lib/intelligence/executive-access';
import { resolveDocumentAccess } from '@/lib/intelligence/document-access';
import { resolveDataHealthAccess } from '@/lib/intelligence/data-health-access';

export type DecisionCaseDomain =
  | 'executive'
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'finance'
  | 'hse'
  | 'documents'
  | 'data_health'
  | 'maintenance'
  | 'geology';

const DIRECT_MODULES = {
  inventory: MODULE_KEYS.BODEGA_INVENTARIO,
  procurement: MODULE_KEYS.FIN_COMPRAS,
  production: MODULE_KEYS.PROD_OPERACIONES,
  finance: MODULE_KEYS.FIN_FINANZAS,
  hse: MODULE_KEYS.HSE_TABLERO,
  maintenance: MODULE_KEYS.MANT_OPERACIONES,
  geology: MODULE_KEYS.PROD_GEOLOGIA,
} as const;

export function isDecisionCaseDomain(value: unknown): value is DecisionCaseDomain {
  return [
    'executive',
    'inventory',
    'procurement',
    'production',
    'finance',
    'hse',
    'documents',
    'data_health',
    'maintenance',
    'geology',
  ].includes(String(value || ''));
}

export async function canAccessDecisionCaseDomain(request: NextRequest, domain: DecisionCaseDomain) {
  if (domain === 'executive') {
    const access = await resolveExecutiveAccess(request);
    return access.ok;
  }
  if (domain === 'documents') {
    const access = await resolveDocumentAccess(request);
    return access.ok;
  }
  if (domain === 'data_health') {
    const access = await resolveDataHealthAccess(request);
    return access.ok;
  }

  const moduleKey = DIRECT_MODULES[domain];
  const access = await requireModuleAccess(request, moduleKey);
  return access.authorized;
}

export async function filterAccessibleDecisionCaseDomains(
  request: NextRequest,
  domains: DecisionCaseDomain[],
) {
  const unique = Array.from(new Set(domains));
  const checks = await Promise.all(unique.map(async (domain) => [domain, await canAccessDecisionCaseDomain(request, domain)] as const));
  return new Set(checks.filter(([, allowed]) => allowed).map(([domain]) => domain));
}
