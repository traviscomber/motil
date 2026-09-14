import { MODULE_KEYS, type AccessLevel, type ModuleKey } from '@/lib/api/module-access';
import type { ExecutiveDomain } from '@/lib/intelligence/executive-access';

export type PermissionProbe = {
  id: string;
  domain: ExecutiveDomain;
  moduleKey: ModuleKey;
  surface: string;
  mutationSurface: boolean;
};

export const CRITICAL_PERMISSION_PROBES: PermissionProbe[] = [
  {
    id: 'executive-production',
    domain: 'production',
    moduleKey: MODULE_KEYS.PROD_OPERACIONES,
    surface: 'Executive Core / Producción',
    mutationSurface: false,
  },
  {
    id: 'executive-maintenance',
    domain: 'maintenance',
    moduleKey: MODULE_KEYS.MANT_GERENCIAL,
    surface: 'Executive Core / Mantención',
    mutationSurface: false,
  },
  {
    id: 'equipment-maintenance',
    domain: 'maintenance',
    moduleKey: MODULE_KEYS.MANT_OPERACIONES,
    surface: 'Equipment Intelligence',
    mutationSurface: false,
  },
  {
    id: 'executive-inventory',
    domain: 'inventory',
    moduleKey: MODULE_KEYS.BODEGA_INVENTARIO,
    surface: 'Executive Core / Inventario',
    mutationSurface: false,
  },
  {
    id: 'executive-procurement',
    domain: 'procurement',
    moduleKey: MODULE_KEYS.FIN_COMPRAS,
    surface: 'Executive Core / Compras',
    mutationSurface: false,
  },
  {
    id: 'executive-finance',
    domain: 'finance',
    moduleKey: MODULE_KEYS.FIN_FINANZAS,
    surface: 'Executive Core / Finanzas',
    mutationSurface: false,
  },
];

export function accessSemantics(level: AccessLevel) {
  return {
    level,
    canRead: level === 'ED' || level === 'LEC',
    canWrite: level === 'ED',
  };
}

export function evaluatePermissionProbe(args: {
  probe: PermissionProbe;
  level: AccessLevel;
  executiveDomainReadable: boolean;
  admin: boolean;
}) {
  const semantics = accessSemantics(args.level);
  const expectedExecutiveRead = args.admin ? true : semantics.canRead;
  const checks = {
    accessLevelSemantics:
      (args.level === 'ED' && semantics.canRead && semantics.canWrite) ||
      (args.level === 'LEC' && semantics.canRead && !semantics.canWrite) ||
      (args.level === 'SR' && !semantics.canRead && !semantics.canWrite),
    executiveDomainAlignment:
      args.probe.id === 'equipment-maintenance'
        ? true
        : args.executiveDomainReadable === expectedExecutiveRead,
    readOnlySurfaceDoesNotRequireWrite:
      args.probe.mutationSurface ? true : semantics.canWrite || semantics.canRead || args.level === 'SR',
  };

  return {
    ...args.probe,
    ...semantics,
    executiveDomainReadable: args.executiveDomainReadable,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}

export const PERMISSION_REGRESSION_POLICY = {
  read: 'ED_or_LEC',
  write: 'ED_only',
  denied: 'SR',
  adminBypass: 'explicit_admin_roles_only',
  authority: 'diagnostic_read_only',
  operationalMutationExecuted: false,
} as const;
