'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AreaNavigation } from '@/components/ui/area-navigation';

const operationItems = [
  { href: '/dashboard/sostenibilidad/prevencion-riesgos', label: 'Resumen' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', label: 'Inspecciones' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', label: 'Capacitaciones' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/compromisos', label: 'Compromisos' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/epp', label: 'EPP' },
];

const controlItems = [
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', label: 'Indicadores' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/epp/diagnostico', label: 'Diagnóstico EPP' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse', label: 'Documentos' },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque', label: 'Carpeta de arranque' },
  { href: '/dashboard/tareas', label: 'Calendario organización' },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard/sostenibilidad/prevencion-riesgos') return pathname === href;
  if (href === '/dashboard/sostenibilidad/prevencion-riesgos/epp') {
    return (pathname === href || pathname === `${href}/importar`) && !pathname.startsWith(`${href}/diagnostico`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RiskPreventionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="Seguridad y salud" primary={operationItems.slice(0, 3)} secondary={[...operationItems.slice(3), ...controlItems]}
        isActive={(href) => isActive(pathname, href)} />
      {children}
    </div>
  );
}
