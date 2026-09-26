'use client';

import { usePathname } from 'next/navigation';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

/* Locale switcher for the authenticated app.
 *
 * The locale lives in the URL (/en prefix, rewritten by the proxy with the
 * x-motil-locale header). Switching locale on the SAME page yields an empty
 * RSC diff (identical route tree), so the App Router would keep the old
 * locale's DOM. We therefore force a full document navigation, same as the
 * landing switcher.
 *
 * Under the /en rewrite, usePathname() returns the internal path without the
 * prefix, so the target is a simple prefix add/remove. */
export function AppLanguageSwitch({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const pathname = usePathname() || '/dashboard';
  const target = locale === 'en' ? pathname : `/en${pathname}`;
  const label = locale === 'en' ? 'ES' : 'EN';
  const ariaLabel = locale === 'en' ? dictionary.app.header.switchToSpanish : dictionary.app.header.switchToEnglish;

  return (
    <a
      href={target}
      lang={locale === 'en' ? 'es' : 'en'}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(target);
      }}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border/70 px-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
    >
      {label}
    </a>
  );
}
