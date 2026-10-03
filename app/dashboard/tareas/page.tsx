import { getDictionaryForRequest } from '@/lib/i18n/server';
import { CalendarWorkspace } from '@/components/calendar/calendar-workspace';

export default async function TareasPage() {
  const { locale, dictionary } = await getDictionaryForRequest();
  return <CalendarWorkspace locale={locale} dictionary={dictionary} />;
}
