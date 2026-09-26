import type { ReactNode } from 'react';
import { getDictionaryForRequest } from '@/lib/i18n/server';
import { ManagementContextNav } from '@/components/layout/management-context-nav';

export default async function DataHealthLayout({ children }: { children: ReactNode }) {
  const { dictionary } = await getDictionaryForRequest();
  return (
    <div className="space-y-5">
      <ManagementContextNav dictionary={dictionary} />
      {children}
    </div>
  );
}
