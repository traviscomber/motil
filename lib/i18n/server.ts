// Resolución de locale en server components.
// Prioridad: header x-motil-locale (fijado por el proxy en reescrituras /en)
// > cookie motil-locale > default 'es'.

import { cookies, headers } from 'next/headers';
import { getDictionary, isLocale, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, type Dictionary, type Locale } from './dictionaries';

export async function getLocale(): Promise<Locale> {
  const headerStore = await headers();
  const headerLocale = headerStore.get(LOCALE_HEADER);
  if (isLocale(headerLocale)) return headerLocale;

  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionaryForRequest(): Promise<{ locale: Locale; dictionary: Dictionary }> {
  const locale = await getLocale();
  return { locale, dictionary: getDictionary(locale) };
}
