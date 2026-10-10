'use client';

import { usePathname } from 'next/navigation';
import { useModuleAccess } from '@/hooks/use-module-access';
import { AreaNavigation } from '@/components/ui/area-navigation';

import type { Dictionary } from '@/lib/i18n/dictionaries';

type ManagementItem = {
  href: string;
  itemKey: 'executive' | 'performance' | 'dataHealth';
  canView: (check: (moduleKey: string) => boolean) => boolean;
};

const items: ManagementItem[] = [
  {
    href: '/dashboard/decisiones',
    itemKey: 'executive',
    canView: (check) => [
      'prod_operaciones',
      'mant_gerencial',
      'bodega_inventario',
      'fin_compras',
      'fin_finanzas',
    ].some(check),
  },
  {
    href: '/dashboard/desempeno',
    itemKey: 'performance',
    canView: (check) => check('core_desempeno'),
  },
  {
    href: '/dashboard/calidad-datos/salud',
    itemKey: 'dataHealth',
    canView: (check) => [
      'prod_operaciones',
      'mant_operaciones',
      'bodega_inventario',
      'fin_compras',
    ].some(check),
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ManagementContextNav({ dictionary }: { dictionary: Dictionary }) {
  const t = dictionary.app.managementNav;
  const pathname = usePathname();
  const { canView, ready } = useModuleAccess();
  const visibleItems = ready ? items.filter((item) => item.canView(canView)) : [];

  if (!ready || visibleItems.length === 0) return null;

  return (
      <AreaNavigation label={t.navAria} primary={visibleItems.map((item) => ({ href: item.href, label: t.items[item.itemKey] }))} secondary={[]}
        isActive={(href) => isActive(pathname, href)} />
  );
}
