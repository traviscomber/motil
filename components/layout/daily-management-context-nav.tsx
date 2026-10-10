'use client';

import { usePathname } from 'next/navigation';
import { AreaNavigation } from '@/components/ui/area-navigation';
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
    <div className="bg-background px-4 md:px-6 xl:px-8">
      <AreaNavigation label={t.contextsAria} primary={items.map((item) => ({ href: item.href, label: t.items[item.itemKey] }))} secondary={[]}
        isActive={(href) => pathname === href || pathname.startsWith(`${href}/`)} />
    </div>
  );
}
