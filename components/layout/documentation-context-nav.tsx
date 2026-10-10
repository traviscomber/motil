'use client';

import { usePathname } from 'next/navigation';
import { AreaNavigation } from '@/components/ui/area-navigation';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const items = [
  { href: '/dashboard/documentos', itemKey: 'library' },
  { href: '/dashboard/documentos-gestion', itemKey: 'control' },
] as const;

export function DocumentationContextNav({ dictionary }: { dictionary: Dictionary }) {
  const t = dictionary.app.docsNav;
  const pathname = usePathname();
  const visible = items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!visible) return null;

  return (
    <div className="bg-background px-4 md:px-6 xl:px-8">
      <AreaNavigation label={t.contextsAria} primary={items.map((item) => ({ href: item.href, label: t.items[item.itemKey] }))} secondary={[]}
        isActive={(href) => pathname === href || pathname.startsWith(`${href}/`)} />
    </div>
  );
}
