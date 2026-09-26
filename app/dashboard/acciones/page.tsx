import { getDictionaryForRequest } from '@/lib/i18n/server';
import { ActionsInbox } from '@/components/actions/actions-inbox';

export default async function AccionesPage() {
  const { locale, dictionary } = await getDictionaryForRequest();
  return <ActionsInbox locale={locale} dictionary={dictionary} />;
}
