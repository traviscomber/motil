'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useModuleAccess } from '@/hooks/use-module-access';
import { cn } from '@/lib/utils';

import type { Dictionary } from '@/lib/i18n/dictionaries';

type ManagementItem = {
  href: string;
  itemKey: 'executive' | 'performance' | 'dataHealth';
  canView: (check: (moduleKey: string) => boolean) => boolean;
};

const items: ManagementItem[] = [
  {
    href: '/dashboard/decisiones',
    itemKey: 'executive',
    canView: (check) => [
      'prod_operaciones',
      'mant_gerencial',
      'bodega_inventario',
      'fin_compras',
      'fin_finanzas',
    ].some(check),
  },
  {
    href: '/dashboard/desempeno',
    itemKey: 'performance',
    canView: (check) => check('core_desempeno'),
  },
  {
    href: '/dashboard/calidad-datos/salud',
    itemKey: 'dataHealth',
    canView: (check) => [
      'prod_operaciones',
      'mant_operaciones',
      'bodega_inventario',
      'fin_compras',
    ].some(check),
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ManagementContextNav({ dictionary }: { dictionary: Dictionary }) {
  const t = dictionary.app.managementNav;
  const pathname = usePathname();
  const { canView, ready } = useModuleAccess();
  const visibleItems = ready ? items.filter((item) => item.canView(canView)) : [];

  if (!ready || visibleItems.length === 0) return null;

  return (
    <section className="border-b border-border" aria-label={t.sectionAria}>
      <div className="flex min-h-12 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
          {t.label}
        </span>
        <nav className="flex items-stretch" aria-label={t.navAria}>
          {visibleItems.map((item) => {
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
                <span className="whitespace-nowrap">{t.items[item.itemKey]}</span>
                {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
