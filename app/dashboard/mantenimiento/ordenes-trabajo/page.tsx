import { getDictionaryForRequest } from '@/lib/i18n/server';
import { WorkOrdersQueue } from '@/components/maintenance/work-orders-queue';

export default async function WorkOrdersPage() {
  const { locale, dictionary } = await getDictionaryForRequest();

  return <WorkOrdersQueue locale={locale} dictionary={dictionary} />;
}
