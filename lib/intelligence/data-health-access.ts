import { NextRequest, NextResponse } from 'next/server';
import { MODULE_KEYS, isAdminRole, requireModuleAccess } from '@/lib/api/module-access';

export type DataHealthDomain = 'production' | 'maintenance' | 'inventory' | 'procurement' | 'hse' | 'legal' | 'finance';

const DOMAIN_MODULES = {
  production: MODULE_KEYS.PROD_OPERACIONES,
  maintenance: MODULE_KEYS.MANT_OPERACIONES,
  inventory: MODULE_KEYS.BODEGA_INVENTARIO,
  procurement: MODULE_KEYS.FIN_COMPRAS,
  hse: MODULE_KEYS.HSE_TABLERO,
  legal: MODULE_KEYS.LEGAL_MODULO,
  finance: MODULE_KEYS.FIN_FINANZAS,
} as const;

export async function resolveDataHealthAccess(request: NextRequest) {
  const entries = await Promise.all(
    (Object.entries(DOMAIN_MODULES) as Array<[DataHealthDomain, (typeof DOMAIN_MODULES)[DataHealthDomain]]>)
      .map(async ([domain, moduleKey]) => [domain, await requireModuleAccess(request, moduleKey)] as const),
  );

  const first = entries[0]?.[1];
  if (!first?.user) {
    return {
      ok: false as const,
      response: first?.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const domains = entries.filter(([, result]) => result.authorized).map(([domain]) => domain);
  const admin = isAdminRole(first.role);
  if (!domains.length && !admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'No tienes acceso a dominios operacionales de Calidad de Datos' }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user: first.user,
    role: first.role,
    organizationId: first.organizationId,
    admin,
    domains: admin ? (Object.keys(DOMAIN_MODULES) as DataHealthDomain[]) : domains,
    canRead: (domain: DataHealthDomain) => admin || domains.includes(domain),
  };
}
