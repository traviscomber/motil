'use client';

import type { ReactNode } from 'react';
import { AreaNavigation } from '@/components/ui/area-navigation';
import { usePathname } from 'next/navigation';

const views = [
  { href: '/dashboard/rrhh', label: 'Personas' },
  { href: '/dashboard/rrhh/operacion', label: 'Capacidad operacional' },
  { href: '/dashboard/rrhh/fuentes', label: 'Fuentes' },
  { href: '/dashboard/tareas', label: 'Calendario' },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard/rrhh') {
    return pathname === href || pathname.startsWith('/dashboard/rrhh/personas/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RrhhLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="RRHH" primary={views.slice(0, 2)} secondary={views.slice(2)} isActive={(href) => isActive(pathname, href)} />
      {children}
    </div>
  );
}
