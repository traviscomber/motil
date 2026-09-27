import { getDictionaryForRequest } from '@/lib/i18n/server';
import { CreateWorkOrder } from '@/components/maintenance/create-work-order';

export default async function CreateWorkOrderPage() {
  const { locale, dictionary } = await getDictionaryForRequest();

  return <CreateWorkOrder locale={locale} dictionary={dictionary} />;
}
