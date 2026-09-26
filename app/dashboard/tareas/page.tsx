import { getDictionaryForRequest } from '@/lib/i18n/server';
import { OperationalCalendar } from '@/components/calendar/operational-calendar';

export default async function TareasPage() {
  const { locale, dictionary } = await getDictionaryForRequest();
  return <OperationalCalendar locale={locale} dictionary={dictionary} />;
}
