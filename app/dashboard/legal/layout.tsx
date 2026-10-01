'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const controlItems = [
  { href: '/dashboard/legal', label: 'Resumen' },
  { href: '/dashboard/legal/inbox', label: 'Inbox' },
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
      <section className="border-b border-border" aria-label="Área Legal y cumplimiento">
        <div className="flex min-h-12 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-stretch">
            <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
              Control
            </span>
            <nav className="flex items-stretch" aria-label="Control legal">
              {controlItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-12 shrink-0 items-center px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mx-2 my-3 w-px shrink-0 bg-border" aria-hidden="true" />

          <div className="flex shrink-0 items-stretch">
            <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
              Herramientas
            </span>
            <nav className="flex items-stretch" aria-label="Herramientas legales">
              {supportItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-12 shrink-0 items-center px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
