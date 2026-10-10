'use client';

import type { ReactNode } from 'react';
import { AreaNavigation } from '@/components/ui/area-navigation';
import { usePathname } from 'next/navigation';
import { useModuleAccess } from '@/hooks/use-module-access';

const operationItems = [
  { href: '/dashboard/finanzas', label: 'Resumen' },
  { href: '/dashboard/finanzas/pagos', label: 'Pagos' },
];

const controlItems = [
  { href: '/dashboard/finanzas/centros', label: 'Centros de costos', moduleKey: 'core_centros_costos' },
  { href: '/dashboard/finanzas/reportes', label: 'Reportes', moduleKey: 'fin_reportes' },
  { href: '/dashboard/finanzas/proveedores', label: 'Proveedores' },
  { href: '/dashboard/finanzas/trazabilidad', label: 'Trazabilidad' },
  { href: '/dashboard/finanzas/fuentes', label: 'Fuentes' },
  { href: '/dashboard/finanzas/documentos', label: 'Documentos' },
];

function isActive(pathname: string, href: string) {
  return href === '/dashboard/finanzas'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canEdit, canView, enforced, ready } = useModuleAccess();
  const visibleOperationItems = operationItems.filter((item) => item.href !== '/dashboard/finanzas/pagos' || (ready && canEdit('fin_finanzas')));
  const visibleControlItems = controlItems.filter((item) => !item.moduleKey || !enforced || canView(item.moduleKey));

  return (
    <div className="space-y-5">
      <AreaNavigation label="Finanzas" primary={visibleOperationItems} secondary={visibleControlItems} isActive={(href) => isActive(pathname, href)} />
      {children}
    </div>
  );
}
