import { getDictionaryForRequest } from '@/lib/i18n/server';
import { DashboardHome } from '@/components/dashboard/dashboard-home';

export default async function DashboardPage() {
  const { locale, dictionary } = await getDictionaryForRequest();
  return <DashboardHome locale={locale} dictionary={dictionary} />;
}
