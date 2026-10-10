'use client';

import type { ReactNode } from 'react';
import { AreaNavigation } from '@/components/ui/area-navigation';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useModuleAccess } from '@/hooks/use-module-access';

type ProductionLane = 'flow' | 'technical';

type ProductionItem = {
  href: string;
  label: string;
  lane: ProductionLane;
  step?: number;
  moduleKey?: string;
  anyModuleKeys?: string[];
};

const items: ProductionItem[] = [
  { href: '/dashboard/produccion', label: 'Resumen', lane: 'flow', step: 1, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/inteligencia', label: 'Mina / Sector', lane: 'flow', step: 2, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/sondaje', label: 'Perforación', lane: 'flow', step: 3, anyModuleKeys: ['prod_sondaje_exploracion', 'prod_sondaje_produccion'] },
  { href: '/dashboard/produccion/transporte-mineral', label: 'Transporte', lane: 'flow', step: 4, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/planta-metalurgia', label: 'Planta / Metalurgia', lane: 'flow', step: 5, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/geologia', label: 'Geología', lane: 'technical', moduleKey: 'prod_geologia' },
  { href: '/dashboard/produccion/topografia', label: 'Topografía', lane: 'technical', moduleKey: 'prod_topografia' },
  { href: '/dashboard/produccion/quimica', label: 'Química', lane: 'technical', moduleKey: 'prod_quimica' },
  { href: '/dashboard/produccion/fuentes', label: 'Fuentes', lane: 'technical', moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/trazabilidad', label: 'Trazabilidad', lane: 'technical', moduleKey: 'prod_operaciones' },
];

function isItemActive(pathname: string, item: ProductionItem) {
  return item.href === '/dashboard/produccion'
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function ProduccionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { enforced, canView } = useModuleAccess();

  const visibleItems = useMemo(() => {
    if (!enforced) return items;
    return items.filter((item) => {
      if (item.anyModuleKeys?.length) return item.anyModuleKeys.some((key) => canView(key));
      if (item.moduleKey) return canView(item.moduleKey);
      return true;
    });
  }, [enforced, canView]);

  const flowItems = visibleItems.filter((item) => item.lane === 'flow');
  const technicalItems = visibleItems.filter((item) => item.lane === 'technical');

  return (
    <div className="space-y-5">
      <AreaNavigation label="Producción" primary={flowItems.slice(0, 2)} secondary={[...flowItems.slice(2), ...technicalItems]} isActive={(href) => isItemActive(pathname, { href, label: '', lane: 'flow' })} />
      {children}
    </div>
  );
}
