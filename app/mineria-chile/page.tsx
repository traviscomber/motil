import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sistema Operativo para Minería en Chile',
  description: 'MOTIL es un Sistema Operativo para Minería en Chile. Conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, HSE y legal bajo una misma trazabilidad operacional.',
  keywords: ['sistema operativo para minería', 'sistemas operativos para minería', 'software de gestión minera Chile', 'software minero Chile', 'ERP minero', 'Mining Operating System'],
  alternates: { canonical: '/mineria-chile' },
  openGraph: {
    title: 'Sistema Operativo para Minería en Chile | MOTIL',
    description: 'Una capa operacional común para conectar la faena completa con trazabilidad, evidencia y control por área.',
    url: 'https://www.motil.app/mineria-chile',
  },
};

const areas = [
  ['Producción', 'produccion', 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje.'],
  ['Mantenimiento', 'mantenimiento', 'OT, activos, planificación, vehículos, repuestos y Maestranza.'],
  ['Inventario', 'inventario', 'Stock, reservas, repuestos, reposición y trazabilidad de materiales.'],
  ['Compras', 'compras', 'Cotizaciones, comparación de proveedores y órdenes de compra.'],
  ['Finanzas', 'finanzas', 'Costos, compromisos, centros de costo y trazabilidad financiera.'],
  ['RRHH', 'rrhh', 'Personas, competencias, desempeño y evidencia laboral y operacional.'],
  ['Sostenibilidad', 'sostenibilidad', 'HSE, prevención de riesgos, EPP, ambiente, comunidades y cumplimiento.'],
  ['Legal', 'legal', 'Contratos, documentos, permisos, vencimientos y cumplimiento.'],
];

const faq = [
  {
    q: '¿Qué es un Sistema Operativo para Minería?',
    a: 'Es una capa operacional que conecta procesos, personas, activos, datos, evidencia y decisiones de una faena bajo una misma arquitectura. MOTIL organiza esas relaciones entre áreas mineras y administrativas sin reducir la operación a un ERP horizontal.',
  },
  {
    q: '¿Qué es MOTIL Mining OS?',
    a: 'MOTIL es un Sistema Operativo para Minería desarrollado por Neuralia en Chile. Su foco es conectar la operación y mantener continuidad entre los datos de terreno, la gestión y la decisión.',
  },
  {
    q: '¿En qué se diferencia de un ERP minero?',
    a: 'Un ERP se concentra principalmente en procesos administrativos y transaccionales. MOTIL parte desde la operación minera y conecta producción, mantenimiento, activos, HSE, personas, abastecimiento, costos y evidencia bajo una misma trazabilidad.',
  },
  {
    q: '¿Incluye software de gestión minera?',
    a: 'Sí. Las capacidades de gestión forman parte del sistema, pero no definen la categoría completa. MOTIL busca operar como una capa superior que conecta gestión, operación, evidencia e inteligencia minera.',
  },
  {
    q: '¿Se puede implementar por módulos?',
    a: 'Sí. Producción, Mantenimiento, Inventario, Compras, Finanzas, RRHH, Sostenibilidad y Legal funcionan como módulos conectados bajo una arquitectura común.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'MOTIL Mining OS',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Sistema Operativo para Minería',
      operatingSystem: 'Web',
      url: 'https://www.motil.app/mineria-chile',
      description: 'Sistema Operativo para Minería en Chile para conectar producción, mantenimiento, inventario, compras, finanzas, RRHH, HSE y legal.',
      areaServed: { '@type': 'Country', name: 'Chile' },
      provider: { '@type': 'Organization', name: 'Neuralia', url: 'https://www.n3uralia.com' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default function MineriaChilePage() {
  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Sistema Operativo para Minería · Chile</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">Sistema Operativo para Minería en Chile</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">MOTIL conecta una operación minera completa: mina, planta, producción, mantenimiento, inventario, abastecimiento, personas, seguridad, finanzas y cumplimiento bajo una misma trazabilidad operacional.</p>

        <section className="mt-12 grid gap-8 border-y py-10 md:grid-cols-3">
          <div><h2 className="text-xl font-semibold">Operación conectada</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Conecta hechos de terreno con responsables, activos, turnos, órdenes, documentos y evidencia.</p></div>
          <div><h2 className="text-xl font-semibold">Una capa común</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Cada área conserva su flujo, pero comparte contexto, identidad y trazabilidad con el resto de la faena.</p></div>
          <div><h2 className="text-xl font-semibold">Más allá del ERP</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">La arquitectura parte desde procesos mineros y operacionales, no desde un ERP horizontal adaptado después.</p></div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Módulos del Sistema Operativo para Minería</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">MOTIL cubre las áreas que sostienen la continuidad operacional y las conecta dentro de una misma arquitectura.</p>
          <div className="mt-6 overflow-hidden rounded-lg border bg-card" aria-label="Módulos de MOTIL Mining OS">
            {areas.map(([name, slug, desc]) => (
              <Link key={slug} href={`/modulos/${slug}`} className="grid gap-2 border-b px-4 py-4 last:border-0 hover:bg-muted/30 sm:grid-cols-[200px_1fr_24px] sm:items-center">
                <h3 className="font-semibold">{name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div><h2 className="text-2xl font-semibold">Trazabilidad operacional</h2><p className="mt-3 leading-relaxed text-muted-foreground">Cada módulo conserva su responsabilidad, pero conecta personas, activos, órdenes, evidencia, documentos y centros de costo mediante identificadores canónicos.</p></div>
          <div><h2 className="text-2xl font-semibold">Implementación modular</h2><p className="mt-3 leading-relaxed text-muted-foreground">Una operación puede habilitar las áreas que necesita y ampliar cobertura sin construir sistemas paralelos ni perder historial.</p></div>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">Sistema Operativo para Minería versus ERP minero</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">MOTIL incluye capacidades administrativas presentes en un ERP, pero su propuesta principal es operacional. El sistema conecta producción, mantenimiento, activos, HSE, personas, abastecimiento, costos, evidencia y contexto para que la gestión conserve la realidad de la faena.</p>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">Software de gestión minera como capa del sistema</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">Las funciones de software minero, gestión, mantenimiento, producción e inventario siguen siendo parte de MOTIL y ayudan a capturar búsquedas existentes. La categoría superior, sin embargo, es Sistema Operativo para Minería.</p>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">Preguntas sobre Sistemas Operativos para Minería</h2>
          <div className="mt-5 divide-y rounded-lg border bg-card">
            {faq.map((item) => <article key={item.q} className="p-5"><h3 className="font-semibold">{item.q}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p></article>)}
          </div>
        </section>

        <section className="mt-14 border-t pt-10"><h2 className="text-2xl font-semibold">MOTIL Mining OS</h2><p className="mt-3 max-w-2xl text-muted-foreground">Sistema Operativo para Minería desarrollado por Neuralia en Chile: una capa común para conectar información de terreno, evidencia, procesos y decisiones entre áreas.</p><Button asChild className="mt-6 gap-2"><Link href="/auth/login">Ingresar a MOTIL <ArrowRight className="h-4 w-4"/></Link></Button></section>
      </div>
    </main>
  );
}
