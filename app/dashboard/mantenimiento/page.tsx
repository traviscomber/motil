import { getDictionaryForRequest } from '@/lib/i18n/server';
import { MaintenanceHome } from '@/components/dashboard/maintenance-home';

export default async function MantenimientoPage() {
  const { locale, dictionary } = await getDictionaryForRequest();
  return <MaintenanceHome locale={locale} dictionary={dictionary} />;
}
