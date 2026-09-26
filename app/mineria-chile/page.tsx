import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDictionaryForRequest } from '@/lib/i18n/server';

const PATH = '/mineria-chile';

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary: dict } = await getDictionaryForRequest();
  const meta = dict.pages.mineria.meta;
  return {
    title: meta.title,
    description: meta.description,
    keywords: [
      'sistema operativo para minería',
      'sistemas operativos para minería',
      'software de gestión minera Chile',
      'software minero Chile',
      'ERP minero',
      'Mining Operating System',
    ],
    alternates: {
      canonical: PATH,
      languages: { 'es-CL': PATH, en: `/en${PATH}`, 'x-default': PATH },
    },
    openGraph: {
      title: meta.ogTitle,
      description: meta.ogDescription,
      url: `https://www.motil.app${PATH}`,
    },
  };
}

export default async function MineriaChilePage() {
  const { locale, dictionary: dict } = await getDictionaryForRequest();
  const t = dict.pages.mineria;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'MOTIL Mining OS',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Sistema Operativo para Minería',
        operatingSystem: 'Web',
        url: `https://www.motil.app${PATH}`,
        inLanguage: locale === 'en' ? 'en' : 'es-CL',
        description: t.meta.description,
        areaServed: [
          { '@type': 'Country', name: 'Chile' },
          { '@type': 'Country', name: 'Peru' },
        ],
        provider: { '@type': 'Organization', name: 'Neuralia', url: 'https://www.n3uralia.com' },
      },
      {
        '@type': 'FAQPage',
        inLanguage: locale === 'en' ? 'en' : 'es-CL',
        mainEntity: t.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">{t.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{t.h1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{t.intro}</p>

        <section className="mt-12 grid gap-8 border-y py-10 md:grid-cols-3">
          {t.pillars.map((pillar) => (
            <div key={pillar.title}>
              <h2 className="text-xl font-semibold">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">{t.modules.title}</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">{t.modules.intro}</p>
          <div className="mt-6 overflow-hidden rounded-lg border bg-card" aria-label={t.modules.aria}>
            {t.areas.map((area) => (
              <Link key={area.slug} href={`/modulos/${area.slug}`} className="grid gap-2 border-b px-4 py-4 last:border-0 hover:bg-muted/30 sm:grid-cols-[200px_1fr_24px] sm:items-center">
                <h3 className="font-semibold">{area.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{area.desc}</p>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div><h2 className="text-2xl font-semibold">{t.traceability.title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{t.traceability.text}</p></div>
          <div><h2 className="text-2xl font-semibold">{t.implementation.title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{t.implementation.text}</p></div>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">{t.vsErp.title}</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{t.vsErp.text}</p>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">{t.gestionLayer.title}</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{t.gestionLayer.text}</p>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">{t.faq.title}</h2>
          <div className="mt-5 divide-y rounded-lg border bg-card">
            {t.faq.items.map((item) => <article key={item.q} className="p-5"><h3 className="font-semibold">{item.q}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p></article>)}
          </div>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">{t.closing.title}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t.closing.text}</p>
          <Button asChild className="mt-6 gap-2"><Link href="/auth/login">{t.closing.cta} <ArrowRight className="h-4 w-4"/></Link></Button>
        </section>
      </div>
    </main>
  );
}
