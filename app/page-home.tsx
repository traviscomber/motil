import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { getDictionaryForRequest } from '@/lib/i18n/server';
import { LanguageSwitch } from '@/components/landing/language-switch';
import LandingStone from './landing-stone';
import './landing.css';

/* Structured data keeps its canonical skeleton literal (locks in
   tests/landing-brand.test.mjs); only locale-dependent descriptions come
   from the dictionary. */
function buildStructuredData(description: string, orgDescription: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'MOTIL Mining OS',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Sistema Operativo para Minería',
        operatingSystem: 'Web',
        url: 'https://www.motil.app',
        description,
        areaServed: { '@type': 'Country', name: 'Chile' },
        provider: { '@type': 'Organization', name: 'Neuralia', url: 'https://www.n3uralia.com' },
      },
      {
        '@type': 'Organization',
        name: 'Neuralia',
        url: 'https://www.n3uralia.com',
        logo: 'https://www.motil.app/brand/motil-wordmark.png',
        description: orgDescription,
        areaServed: ['Chile', 'Peru', 'LATAM'],
        sameAs: ['https://www.n3uralia.com'],
        brand: { '@type': 'Brand', name: 'MOTIL', url: 'https://www.motil.app' },
      },
    ],
  };
}

/* Measured icon centers in /brand/context-flow.webp (2400px wide) so each
   label sits exactly under its icon. Recompute if the artwork is re-exported. */
const flowLabelCenters = [7.4, 20.88, 33.25, 45.1, 58.58, 69.38, 79.73, 92.4];

export default async function HomePage() {
  const { locale, dictionary: dict } = await getDictionaryForRequest();
  const structuredData = buildStructuredData(dict.landing.seo.description, dict.landing.seo.orgDescription);
  return (
    <main className="motil-landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header className="ld-header">
        <Link href="/" className="ld-wordmark" aria-label="MOTIL Mining Operating System">
          <Image
            src="/brand/motil-wordmark.png"
            alt="MOTIL"
            width={2094}
            height={610}
            priority
          />
          <span>{dict.landing.wordmarkLine}</span>
        </Link>
        <nav className="ld-nav" aria-label="Navegación principal">
          <Link href="#contexto" className="ld-nav-link">{dict.nav.system}</Link>
          <span className="ld-nav-divider" aria-hidden="true" />
          <Link href="/auth/login" className="ld-nav-cta">{dict.nav.login}</Link>
          <LanguageSwitch
            href={locale === 'en' ? '/' : '/en'}
            label={dict.common.languageSwitch}
            ariaLabel={locale === 'en' ? 'Cambiar a español' : 'Switch to English'}
            lang={locale === 'en' ? 'es' : 'en'}
          />
        </nav>
      </header>

      <section className="ld-section" data-landing-section="hero" aria-label="MOTIL Mining Operating System">
        <div className="ld-inner ld-split">
          <div className="ld-copy">
            <p className="ld-eyebrow">{dict.landing.hero.eyebrow}</p>
            <h1 className="ld-h1">
              {dict.landing.hero.h1Lines[0]}<br />{dict.landing.hero.h1Lines[1]}<br /><span className="ld-accent">{dict.landing.hero.h1Lines[2]}</span>
            </h1>
            <p className="ld-body-lg">
              {dict.landing.hero.body}
            </p>
            <div className="ld-ctas">
              <Link href="/auth/login" className="ld-btn ld-btn-solid">{dict.landing.ctaLogin} <ArrowRight size={16} strokeWidth={1.5} /></Link>
              <Link href="#contexto" className="ld-btn ld-btn-ghost">{dict.landing.ctaExplore} <ArrowDown size={16} strokeWidth={1.5} /></Link>
            </div>
          </div>
          <LandingStone />
        </div>
      </section>

      <section className="ld-section ld-light" id="contexto" data-landing-section="contexto" aria-label={dict.landing.context.aria}>
        <div className="ld-inner">
          <div className="ld-copy">
            <p className="ld-eyebrow">{dict.landing.context.eyebrow}</p>
            <h2 className="ld-h2">
              {dict.landing.context.h2Lines[0]}<br />{dict.landing.context.h2Lines[1]}<span className="ld-accent">{dict.landing.context.h2Lines[2]}</span>
            </h2>
            <p className="ld-body-lg">
              {dict.landing.context.body}
            </p>
          </div>
          <div className="ld-flow">
            <div className="ld-flow-inner">
              <Image
                src="/brand/context-flow.webp"
                alt={dict.landing.alts.flow}
                width={2400}
                height={800}
              />
              <div className="ld-flow-labels" aria-hidden="true">
                {dict.landing.flow.labels.map((label, index) => (
                  <span
                    key={label}
                    style={{ left: `${flowLabelCenters[index]}%` }}
                    className={index === dict.landing.flow.labels.length - 1 ? 'ld-flow-label ld-flow-label-accent' : 'ld-flow-label'}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="ld-pillars">
            {dict.landing.context.pillars.map((pillar) => (
              <div key={pillar.title} className="ld-pillar">
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ld-section" id="mineria" data-landing-section="mining" aria-label={dict.landing.mining.aria}>
        <div className="ld-inner ld-mining-grid">
          <div className="ld-copy">
            <p className="ld-eyebrow">{dict.landing.mining.eyebrow}</p>
            <h2 className="ld-h2">
              {dict.landing.mining.h2Lines[0]}<br />{dict.landing.mining.h2Lines[1]}<br /><span className="ld-accent">{dict.landing.mining.h2Lines[2]}</span>
            </h2>
            <p className="ld-body-lg">
              {dict.landing.mining.body}
            </p>
            <div className="ld-domains">
              {dict.landing.mining.domains.map((domain) => (
                <div key={domain.title} className="ld-domain">
                  <span className="ld-domain-title">{domain.title}</span>
                  <span className="ld-domain-items">{domain.items}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ld-mining-photo">
            <Image
              src="/brand/mining-truck.webp"
              alt={dict.landing.alts.truck}
              width={2048}
              height={1152}
            />
          </div>
        </div>
      </section>

      <section className="ld-section" id="latam" data-landing-section="latam" aria-label={dict.landing.latam.aria}>
        <div className="ld-inner ld-split">
          <div className="ld-copy">
            <p className="ld-eyebrow">{dict.landing.latam.eyebrow}</p>
            <h2 className="ld-h2">
              {dict.landing.latam.h2Lines[0]}<br />{dict.landing.latam.h2Lines[1]}<span className="ld-accent">{dict.landing.latam.h2Lines[2]}</span>
            </h2>
            <p className="ld-body-lg">
              {dict.landing.latam.body}
            </p>
            <div className="ld-ctas">
              <Link href="/auth/login" className="ld-btn ld-btn-solid">{dict.landing.ctaLogin} <ArrowRight size={16} strokeWidth={1.5} /></Link>
              <a href="https://www.n3uralia.com" target="_blank" rel="noreferrer" className="ld-btn ld-btn-ghost">{dict.landing.ctaContact} <ArrowRight size={16} strokeWidth={1.5} /></a>
            </div>
            <p className="ld-latam-meta">{dict.landing.latam.meta}</p>
          </div>
          <Image
            src="/brand/latam-stone.webp"
            alt={dict.landing.alts.map}
            width={1024}
            height={1024}
            className="ld-map"
          />
        </div>
        <footer className="ld-footer-strip">
          <Image
            src="/brand/motil-wordmark.png"
            alt="MOTIL — Mining Operating System"
            width={2094}
            height={610}
            className="ld-footer-mark"
          />
          <nav aria-label={dict.landing.footer.areasAria}>
            <span>{dict.landing.footer.areas[0]}</span><span>/</span><span>{dict.landing.footer.areas[1]}</span><span>/</span><span>{dict.landing.footer.areas[2]}</span><span>/</span><span>{dict.landing.footer.areas[3]}</span>
          </nav>
          <span>{dict.landing.footer.by}</span>
        </footer>
      </section>
    </main>
  );
}
