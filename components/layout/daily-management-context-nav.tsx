'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const items = [
  { href: '/dashboard/daily-management', itemKey: 'review' },
  { href: '/dashboard/acciones', itemKey: 'actions' },
  { href: '/dashboard/tareas', itemKey: 'calendar' },
] as const;

const managedPaths = items.map((item) => item.href);

export function DailyManagementContextNav({ dictionary }: { dictionary: Dictionary }) {
  const t = dictionary.app.dailyNav;
  const pathname = usePathname();
  const visible = managedPaths.some((href) => pathname === href || pathname.startsWith(`${href}/`));
  if (!visible) return null;

  return (
    <section className="border-b border-border bg-background" aria-label={t.label}>
      <div className="flex min-h-11 items-stretch overflow-x-auto px-4 [scrollbar-width:none] md:px-6 xl:px-8 [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center pr-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
          {t.label}
        </span>
        <nav className="flex items-stretch" aria-label={t.contextsAria}>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 shrink-0 items-center px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="whitespace-nowrap">{t.items[item.itemKey]}</span>
                {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
