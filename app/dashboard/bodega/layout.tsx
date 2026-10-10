'use client';

import type { ReactNode } from 'react';
import { AreaNavigation } from '@/components/ui/area-navigation';
import { usePathname } from 'next/navigation';
import { useModuleAccess } from '@/hooks/use-module-access';

const operationItems = [
  { href: '/dashboard/bodega', label: 'Inventario' },
  { href: '/dashboard/bodega/repuestos-criticos', label: 'Repuestos críticos' },
];

const supportItems = [
  { href: '/dashboard/bodega/productos-360', label: 'Producto 360°' },
  { href: '/dashboard/bodega/inteligencia', label: 'Inteligencia' },
  { href: '/dashboard/bodega/documentos', label: 'Documentos' },
  { href: '/dashboard/bodega/fuentes', label: 'Fuentes' },
  { href: '/dashboard/bodega/importar-datos', label: 'Importar' },
];

function isActive(pathname: string, href: string) {
  return href === '/dashboard/bodega'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function WarehouseLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canEdit, ready } = useModuleAccess();
  const visibleSupportItems = supportItems.filter((item) => item.href !== '/dashboard/bodega/importar-datos' || (ready && canEdit('bodega_inventario')));

  return (
    <div className="space-y-5">
      <AreaNavigation label="Bodega" primary={operationItems} secondary={visibleSupportItems} isActive={(href) => isActive(pathname, href)} />
      {children}
    </div>
  );
}
