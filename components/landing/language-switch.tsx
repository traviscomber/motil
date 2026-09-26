'use client';

// The language switch must always trigger a FULL document navigation.
// Client-side RSC fetches to /en go through the proxy rewrite and come back
// as empty diffs in production, so both next/link AND plain anchors get
// soft-navigated by the App Router and leave the old locale's DOM in place.
// preventDefault + location.assign bypasses the router entirely; with JS
// disabled the plain href still works as a normal document request.
export function LanguageSwitch({
  href,
  label,
  ariaLabel,
  lang,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  lang: string;
}) {
  return (
    <a
      href={href}
      className="ld-lang-switch"
      aria-label={ariaLabel}
      lang={lang}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {label}
    </a>
  );
}
