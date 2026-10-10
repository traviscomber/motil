'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AreaNavigation } from '@/components/ui/area-navigation';

const controlItems = [
  { href: '/dashboard/legal', label: 'Resumen' },
  { href: '/dashboard/legal/inbox', label: 'Bandeja' },
  { href: '/dashboard/legal/casos', label: 'Casos' },
  { href: '/dashboard/legal/control-contractual', label: 'Control contractual' },
  { href: '/dashboard/legal/avances-contractistas', label: 'Avances' },
  { href: '/dashboard/legal/sernageomin', label: 'Obligaciones' },
  { href: '/dashboard/legal/plazos-fatales', label: 'Plazos fatales' },
  { href: '/dashboard/legal/propiedad-minera', label: 'Propiedad minera' },
  { href: '/dashboard/legal/permisos-licencias', label: 'Permisos y licencias' },
  { href: '/dashboard/legal/documentos', label: 'Documentos' },
];

const supportItems = [
  { href: '/dashboard/legal/importar', label: 'Importar' },
];

function isActive(pathname: string, href: string) {
  return href === '/dashboard/legal'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function LegalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="Legal" primary={controlItems.slice(0, 3)} secondary={[...controlItems.slice(3), ...supportItems]}
        isActive={(href) => isActive(pathname, href)} />
      {children}
    </div>
  );
}
