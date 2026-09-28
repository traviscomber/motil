import { getDictionaryForRequest } from '@/lib/i18n/server';
import { WorkOrderDetail } from '@/components/maintenance/work-order-detail';

export default async function WorkOrderDetailPage() {
  const { locale, dictionary } = await getDictionaryForRequest();

  return <WorkOrderDetail locale={locale} dictionary={dictionary} />;
}
