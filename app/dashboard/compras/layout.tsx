'use client';

import type { ReactNode } from 'react';
import { AreaNavigation } from '@/components/ui/area-navigation';
import { usePathname } from 'next/navigation';

const flowItems = [
  { href: '/dashboard/compras/flujo', label: 'Comprar', step: 1 },
  { href: '/dashboard/compras/control-proveedores/candidatos', label: 'Cotizar', step: 2 },
  { href: '/dashboard/compras', label: 'Órdenes', step: 3 },
  { href: '/dashboard/compras/facturas', label: 'Facturas', step: 4 },
];

const supportItems = [
  { href: '/dashboard/compras/proveedores-360', label: 'Proveedores' },
  { href: '/dashboard/compras/devoluciones', label: 'Devoluciones' },
  { href: '/dashboard/compras/documentos', label: 'Documentos' },
  { href: '/dashboard/compras/fuentes', label: 'Fuentes' },
  { href: '/dashboard/compras/inteligencia', label: 'Análisis' },
  { href: '/dashboard/compras/importar-existencias', label: 'Importar' },
];

const supplierPrefixes = [
  '/dashboard/compras/control-proveedores',
  '/dashboard/compras/proveedores-360',
];

function isFlowActive(pathname: string, href: string) {
  if (href === '/dashboard/compras') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSupportActive(pathname: string, href: string) {
  if (href === '/dashboard/compras/proveedores-360') {
    return supplierPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
      && pathname !== '/dashboard/compras/control-proveedores/candidatos';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PurchasesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="Compras" primary={[{ href: '/dashboard/compras', label: 'Pendientes' }, flowItems[0], flowItems[3]]} secondary={[flowItems[1], ...supportItems]} isActive={(href) => isFlowActive(pathname, href) || isSupportActive(pathname, href)} />
      {children}
    </div>
  );
}
