import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { getDictionaryForRequest } from '@/lib/i18n/server';
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
        description: orgDescription,
        areaServed: 'Chile',
      },
    ],
  };
}

const flowLabels = ['People', 'Assets', 'Work', 'Materials', 'Production', 'Cost', 'Risk', 'Decisions'];
/* Measured icon centers in /brand/context-flow.webp (2400px wide) so each
   label sits exactly under its icon. Recompute if the artwork is re-exported. */
const flowLabelCenters = [7.4, 20.88, 33.25, 45.1, 58.58, 69.38, 79.73, 92.4];

const domains = [
  { title: 'Operations', items: 'Production · Maintenance · Field execution' },
  { title: 'Control', items: 'Assets · Materials · Cost · Risk' },
  { title: 'Decisions', items: 'Evidence · Context · Action' },
];

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
          <span>MINING OPERATING SYSTEM</span>
        </Link>
        <nav className="ld-nav" aria-label="Navegación principal">
          <Link href="#contexto" className="ld-nav-link">{dict.nav.system}</Link>
          <span className="ld-nav-divider" aria-hidden="true" />
          <Link href="/auth/login" className="ld-nav-cta">{dict.nav.login}</Link>
          <Link
            href={locale === 'en' ? '/' : '/en'}
            className="ld-lang-switch"
            aria-label={locale === 'en' ? 'Cambiar a español' : 'Switch to English'}
            lang={locale === 'en' ? 'es' : 'en'}
          >
            {dict.common.languageSwitch}
          </Link>
        </nav>
      </header>

      <section className="ld-section" data-landing-section="hero" aria-label="MOTIL Mining Operating System">
        <div className="ld-inner ld-split">
          <div className="ld-copy">
            <p className="ld-eyebrow">Mining Operating System</p>
            <h1 className="ld-h1">
              One operation.<br />One source of truth.<br /><span className="ld-accent">Better decisions.</span>
            </h1>
            <p className="ld-body-lg">
              MOTIL connects people, assets, production, maintenance and operational evidence in one mining operating system.
            </p>
            <div className="ld-ctas">
              <Link href="/auth/login" className="ld-btn ld-btn-solid">{dict.landing.ctaLogin} <ArrowRight size={16} strokeWidth={1.5} /></Link>
              <Link href="#contexto" className="ld-btn ld-btn-ghost">{dict.landing.ctaExplore} <ArrowDown size={16} strokeWidth={1.5} /></Link>
            </div>
          </div>
          <LandingStone />
        </div>
      </section>

      <section className="ld-section ld-light" id="contexto" data-landing-section="contexto" aria-label="One operating context">
        <div className="ld-inner">
          <div className="ld-copy">
            <p className="ld-eyebrow">01 — One operating context</p>
            <h2 className="ld-h2">
              From operations<br />to <span className="ld-accent">real impact.</span>
            </h2>
            <p className="ld-body-lg">
              MOTIL connects people, assets, work, materials, production, cost and risk in one operational context.
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
                {flowLabels.map((label, index) => (
                  <span
                    key={label}
                    style={{ left: `${flowLabelCenters[index]}%` }}
                    className={index === flowLabels.length - 1 ? 'ld-flow-label ld-flow-label-accent' : 'ld-flow-label'}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="ld-pillars">
            <div className="ld-pillar">
              <h3>Connected</h3>
              <p>One operational context.</p>
            </div>
            <div className="ld-pillar">
              <h3>Traceable</h3>
              <p>Evidence follows every action.</p>
            </div>
            <div className="ld-pillar">
              <h3>Canonical</h3>
              <p>One source of truth.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ld-section" id="mineria" data-landing-section="mining" aria-label="Built for mining">
        <div className="ld-inner ld-mining-grid">
          <div className="ld-copy">
            <p className="ld-eyebrow">02 — Built for mining</p>
            <h2 className="ld-h2">
              Real operations.<br />Real data.<br /><span className="ld-accent">Real decisions.</span>
            </h2>
            <p className="ld-body-lg">
              From field activity to management decisions, MOTIL keeps the operation connected in one shared context.
            </p>
            <div className="ld-domains">
              {domains.map((domain) => (
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

      <section className="ld-section" id="latam" data-landing-section="latam" aria-label="Chile y LATAM">
        <div className="ld-inner ld-split">
          <div className="ld-copy">
            <p className="ld-eyebrow">03 — Chile / LATAM</p>
            <h2 className="ld-h2">
              Built in Chile.<br />Designed for <span className="ld-accent">LATAM.</span>
            </h2>
            <p className="ld-body-lg">
              A mining operating system designed for real operations, ready to scale across increasingly connected sites.
            </p>
            <div className="ld-ctas">
              <Link href="/auth/login" className="ld-btn ld-btn-solid">{dict.landing.ctaLogin} <ArrowRight size={16} strokeWidth={1.5} /></Link>
              <a href="https://www.n3uralia.com" target="_blank" rel="noreferrer" className="ld-btn ld-btn-ghost">{dict.landing.ctaContact} <ArrowRight size={16} strokeWidth={1.5} /></a>
            </div>
            <p className="ld-latam-meta">CHILE&nbsp;&nbsp;/&nbsp;&nbsp;PERU&nbsp;&nbsp;/&nbsp;&nbsp;LATAM</p>
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
          <nav aria-label="Áreas de impacto">
            <span>People</span><span>/</span><span>Assets</span><span>/</span><span>Operations</span><span>/</span><span>Real impact</span>
          </nav>
          <span>A solution by N3URALIA</span>
        </footer>
      </section>
    </main>
  );
}
