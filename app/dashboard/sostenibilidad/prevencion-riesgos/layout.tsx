'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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
      <section className="border-b border-border/70 pb-2" aria-label="Controles locales de Seguridad y salud">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
          Seguridad y salud
        </div>
        <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex shrink-0 items-center" aria-label="Trabajo de Seguridad y salud">
            {operationItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mx-2 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
          <span className="mr-1.5 shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/45">Control</span>
          <nav className="flex shrink-0 items-center" aria-label="Control de Seguridad y salud">
            {controlItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>
      {children}
    </div>
  );
}
