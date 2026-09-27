import { getDictionaryForRequest } from '@/lib/i18n/server';
import { DailyReview } from '@/components/dashboard/daily-review';

export default async function DailyManagementPage() {
  const { locale, dictionary } = await getDictionaryForRequest();
  return <DailyReview locale={locale} dictionary={dictionary} />;
}
