'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const views = [
  { href: '/dashboard/rrhh', label: 'Personas' },
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
      <section className="border-b border-border" aria-label="Vistas de Recursos Humanos">
        <div className="flex min-h-12 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
            RRHH
          </span>
          <nav className="flex items-stretch" aria-label="Navegación de Recursos Humanos">
            {views.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-12 shrink-0 items-center px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
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
