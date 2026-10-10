'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AreaNavigation } from '@/components/ui/area-navigation';

const views = [
  { href: '/dashboard/mantenimiento/planificacion', label: 'Planes preventivos' },
  { href: '/dashboard/mantenimiento/planificacion/recursos', label: 'Recursos y capacidad' },
];

export default function MaintenancePlanningLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="Vistas de Planificación de Mantenimiento" primary={views} secondary={[]}
        isActive={(href) => href === '/dashboard/mantenimiento/planificacion' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)} />
      {children}
    </div>
  );
}
