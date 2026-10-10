'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { AreaNavigation } from '@/components/ui/area-navigation';

type ViewerMode = 'leadership' | 'planning' | 'execution' | 'oversight' | 'general';
type ViewerContext = { mode?: ViewerMode };

type NavItem = { href: string; label: string; step?: number };

const flowItems: NavItem[] = [
  { href: '/dashboard/mantenimiento/planificacion', label: 'Planificar', step: 1 },
  { href: '/dashboard/mantenimiento/ordenes-trabajo', label: 'Órdenes', step: 2 },
  { href: '/dashboard/mantenimiento/ordenes-trabajo/cierre', label: 'Cierre', step: 3 },
];

const supportItems: NavItem[] = [
  { href: '/dashboard/mantenimiento', label: 'Resumen' },
  { href: '/dashboard/mantenimiento/ordenes-trabajo/imputacion', label: 'Imputación' },
  { href: '/dashboard/mantenimiento/equipos', label: 'Activos' },
  { href: '/dashboard/mantenimiento/maestranza', label: 'Maestranza' },
  { href: '/dashboard/mantenimiento/personal', label: 'Personal' },
  { href: '/dashboard/mantenimiento/indicadores', label: 'Indicadores' },
  { href: '/dashboard/mantenimiento/fuentes', label: 'Fuentes' },
];

const roleNavigation: Record<ViewerMode, { flow: string[]; support: string[] }> = {
  leadership: {
    flow: ['Planificar', 'Órdenes', 'Cierre'],
    support: ['Resumen', 'Imputación', 'Activos', 'Maestranza', 'Personal', 'Indicadores', 'Fuentes'],
  },
  planning: {
    flow: ['Planificar', 'Órdenes'],
    support: ['Resumen', 'Activos', 'Fuentes'],
  },
  execution: {
    flow: ['Órdenes', 'Cierre'],
    support: ['Resumen'],
  },
  oversight: {
    flow: ['Órdenes'],
    support: ['Resumen', 'Activos', 'Indicadores', 'Fuentes'],
  },
  general: {
    flow: ['Planificar', 'Órdenes', 'Cierre'],
    support: ['Resumen', 'Imputación', 'Activos', 'Maestranza', 'Personal', 'Indicadores', 'Fuentes'],
  },
};

const assetViewPrefixes = [
  '/dashboard/mantenimiento/disponibilidad',
  '/dashboard/mantenimiento/costos',
  '/dashboard/mantenimiento/neumaticos',
  '/dashboard/mantenimiento/componentes-mayores',
  '/dashboard/mantenimiento/fichas-tecnicas',
  '/dashboard/mantenimiento/documentos/expedientes',
  '/dashboard/mantenimiento/centro-costo',
  '/dashboard/mantenimiento/vehiculos',
  '/dashboard/mantenimiento/ciclo-vida',
  '/dashboard/mantenimiento/data-readiness',
];

const planningPrefixes = [
  '/dashboard/mantenimiento/campanas',
  '/dashboard/mantenimiento/confiabilidad',
  '/dashboard/mantenimiento/bom',
  '/dashboard/mantenimiento/planes-estandar',
  '/dashboard/mantenimiento/retroalimentacion-renovacion',
  '/dashboard/mantenimiento/aplicacion-retroalimentacion',
  '/dashboard/mantenimiento/aprobacion-retroalimentacion',
  '/dashboard/mantenimiento/verificacion-retroalimentacion',
  '/dashboard/mantenimiento/seguimiento-excepciones',
  '/dashboard/mantenimiento/estrategia',
];

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el contexto de mantenimiento.');
  return payload as T;
};

function isFlowActive(pathname: string, href: string) {
  if (href === '/dashboard/mantenimiento/planificacion') {
    return pathname === href || pathname.startsWith(`${href}/`) || planningPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  if (href === '/dashboard/mantenimiento/ordenes-trabajo') {
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !pathname.startsWith('/dashboard/mantenimiento/ordenes-trabajo/imputacion') &&
      !pathname.startsWith('/dashboard/mantenimiento/ordenes-trabajo/cierre')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSupportActive(pathname: string, href: string) {
  if (href === '/dashboard/mantenimiento') return pathname === href;
  if (href === '/dashboard/mantenimiento/equipos') {
    return pathname === href || pathname.startsWith(`${href}/`) || assetViewPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: viewer } = useSWR<ViewerContext>(
    '/api/maintenance/viewer-context',
    (url) => fetcher<ViewerContext>(url),
    { revalidateOnFocus: false },
  );
  const mode: ViewerMode = viewer?.mode || 'general';
  const allowed = roleNavigation[mode] || roleNavigation.general;
  const visibleFlowItems = flowItems.filter((item) => allowed.flow.includes(item.label));
  const visibleSupportItems = supportItems.filter((item) => allowed.support.includes(item.label));

  return (
    <div className="space-y-5">
      <AreaNavigation label="Mantenimiento" primary={visibleFlowItems} secondary={visibleSupportItems}
        isActive={(href) => flowItems.some((item) => item.href === href) ? isFlowActive(pathname, href) : isSupportActive(pathname, href)} />
      {children}
    </div>
  );
}
