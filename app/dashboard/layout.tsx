import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getDictionaryForRequest } from '@/lib/i18n/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');

  if (!authToken) {
    redirect('/login');
  }

  const { locale, dictionary } = await getDictionaryForRequest();

  return <DashboardShell locale={locale} dictionary={dictionary}>{children}</DashboardShell>;
}
