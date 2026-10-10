'use client';

import { usePathname } from 'next/navigation';
import { AreaNavigation } from '@/components/ui/area-navigation';

const domainItems = [
  { label: 'Resumen', href: '/dashboard/sostenibilidad', exact: true },
  { label: 'Seguridad y salud', href: '/dashboard/sostenibilidad/prevencion-riesgos' },
  { label: 'Cumplimiento minero', href: '/dashboard/sostenibilidad/compliance' },
  { label: 'Medio ambiente', href: '/dashboard/sostenibilidad/medio-ambiente' },
  { label: 'Comunidades', href: '/dashboard/sostenibilidad/comunidades' },
];

const supportItems = [
  { label: 'Calendario', href: '/dashboard/sostenibilidad/calendario' },
  { label: 'Documentos', href: '/dashboard/sostenibilidad/documentos' },
];

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SostenibilidadLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="Sostenibilidad" primary={domainItems.slice(0, 2)} secondary={[...domainItems.slice(2), ...supportItems]}
        isActive={(href) => isActive(pathname, href, href === "/dashboard/sostenibilidad")} />
      {children}
    </div>
  );
}
