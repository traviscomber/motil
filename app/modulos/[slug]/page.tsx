import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDictionaryForRequest } from '@/lib/i18n/server';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const SLUGS = ['produccion', 'mantenimiento', 'inventario', 'compras', 'finanzas', 'rrhh', 'sostenibilidad', 'legal'] as const;
type ModuleSlug = (typeof SLUGS)[number];

function moduleData(dict: Dictionary, slug: string) {
  if ((SLUGS as readonly string[]).includes(slug)) {
    return dict.pages.modulos.items[slug as ModuleSlug];
  }
  return null;
}

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { dictionary: dict } = await getDictionaryForRequest();
  const mod = moduleData(dict, slug);
  if (!mod) return {};
  const chrome = dict.pages.modulos.chrome;
  return {
    title: `${mod.title} ${chrome.metaTitleSuffix}`,
    description: `${mod.description} ${chrome.metaDescriptionSuffix}`,
    alternates: {
      canonical: `/modulos/${slug}`,
      languages: { 'es-CL': `/modulos/${slug}`, en: `/en/modulos/${slug}`, 'x-default': `/modulos/${slug}` },
    },
  };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale, dictionary: dict } = await getDictionaryForRequest();
  const mod = moduleData(dict, slug);
  if (!mod) notFound();
  const chrome = dict.pages.modulos.chrome;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: `MOTIL Mining OS — ${mod.name}`,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Sistema Operativo para Minería',
        operatingSystem: 'Web',
        url: `https://www.motil.app/modulos/${slug}`,
        inLanguage: locale === 'en' ? 'en' : 'es-CL',
        description: mod.description,
        areaServed: { '@type': 'Country', name: 'Chile' },
        provider: { '@type': 'Organization', name: 'Neuralia', url: 'https://www.n3uralia.com' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'MOTIL', item: 'https://www.motil.app/' },
          { '@type': 'ListItem', position: 2, name: 'Sistema Operativo para Minería', item: 'https://www.motil.app/mineria-chile' },
          { '@type': 'ListItem', position: 3, name: mod.name, item: `https://www.motil.app/modulos/${slug}` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">{chrome.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{mod.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{mod.description}</p>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">{chrome.capabilities}</h2>
          <div className="mt-5 overflow-hidden rounded-lg border bg-card">
            {mod.capabilities.map((item) => <div key={item} className="border-b px-4 py-4 text-sm font-medium last:border-0">{item}</div>)}
          </div>
        </section>

        <section className="mt-12 border-t pt-10">
          <h2 className="text-2xl font-semibold">{chrome.integration}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {mod.operations.map((item) => <p key={item} className="rounded-lg border bg-card p-5 text-sm leading-relaxed text-muted-foreground">{item}</p>)}
          </div>
          <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">{mod.outcome}</p>
        </section>

        <section className="mt-12 grid gap-8 border-t pt-10 md:grid-cols-2">
          <div><h2 className="text-xl font-semibold">{chrome.connectedTitle}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{chrome.connectedText}</p></div>
          <div><h2 className="text-xl font-semibold">{chrome.traceTitle}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{chrome.traceText}</p></div>
        </section>

        <section className="mt-12 border-t pt-10">
          <h2 className="text-xl font-semibold">{chrome.closingTitle}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{mod.name} {chrome.closingLead}</p>
        </section>

        <div className="mt-12 flex flex-wrap gap-4"><Link className="text-sm font-medium text-primary hover:underline" href="/mineria-chile">{chrome.linkChile}</Link><Link className="text-sm font-medium text-primary hover:underline" href="/">{chrome.linkAll}</Link></div>
      </div>
    </main>
  );
}
