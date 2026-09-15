'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Boxes, CircleDollarSign, FileCheck, Leaf, Package, ShieldCheck, ShoppingCart, Users, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const modules = [
  { icon: Zap, name: 'Producción', desc: 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje.' },
  { icon: Wrench, name: 'Mantenimiento', desc: 'Órdenes de trabajo, activos, planificación, vehículos y Maestranza.' },
  { icon: Boxes, name: 'Inventario', desc: 'Stock, reservas, repuestos, reposición y trazabilidad.' },
  { icon: ShoppingCart, name: 'Compras', desc: 'Cotizaciones, órdenes, proveedores y comparación de alternativas.' },
  { icon: CircleDollarSign, name: 'Finanzas', desc: 'Costos, compromisos, centros de costo y trazabilidad financiera.' },
  { icon: Users, name: 'RRHH', desc: 'Personas, asistencia, competencias, desempeño y evidencia laboral.' },
  { icon: Leaf, name: 'Sostenibilidad', desc: 'HSE, prevención, EPP, medio ambiente, comunidades y cumplimiento.' },
  { icon: FileCheck, name: 'Legal', desc: 'Contratos, documentos, permisos, vencimientos y cumplimiento.' },
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
      url: 'https://www.motil.app',
      description: 'Sistema Operativo para Minería en Chile que conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, HSE y legal con trazabilidad operacional.',
      areaServed: { '@type': 'Country', name: 'Chile' },
      provider: { '@type': 'Organization', name: 'Neuralia', url: 'https://www.n3uralia.com' },
    },
    {
      '@type': 'Organization',
      name: 'Neuralia',
      url: 'https://www.n3uralia.com',
      description: 'Empresa chilena de desarrollo de software e inteligencia artificial, creadora de MOTIL Mining OS.',
      areaServed: 'Chile',
    },
  ],
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-xl font-bold tracking-tight text-foreground">MOTIL</Link>
          <Button asChild><Link href="/auth/login">Iniciar sesión</Link></Button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mx-auto inline-flex rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Sistema Operativo para Minería · Chile</p>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">MOTIL. El sistema operativo para la minería.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            MOTIL conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, sostenibilidad HSE y legal en una sola capa operacional, con trazabilidad, evidencia y contexto compartido entre áreas.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2"><Link href="/auth/login">Ingresar a MOTIL <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="#modulos">Ver módulos</Link></Button>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-4">
          {[
            ['Una operación conectada', 'Mina, planta y áreas de soporte trabajan sobre un mismo contexto operacional.'],
            ['Trazabilidad operacional', 'Personas, activos, órdenes, documentos y decisiones quedan conectados.'],
            ['Datos canónicos', 'Una fuente de verdad por cada hecho operacional relevante.'],
            ['Diseñado para minería', 'Flujos orientados a mina, planta, mantenimiento, HSE y gestión de faena.'],
          ].map(([title, text]) => <div key={title}><p className="font-heading text-lg font-semibold">{title}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Capas operacionales</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ocho áreas, un solo sistema operativo</h2>
          <p className="mt-3 text-muted-foreground">Cada área mantiene su responsabilidad, permisos y flujos, pero comparte evidencia y contexto con el resto de MOTIL.</p>
        </div>
        <div className="mt-10 overflow-hidden rounded-lg border bg-card">
          {modules.map((item) => (
            <div key={item.name} className="grid gap-3 border-b px-4 py-4 last:border-0 sm:grid-cols-[32px_180px_1fr] sm:items-center sm:gap-4">
              <item.icon className="h-5 w-5 text-primary" />
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold text-primary">Operación minera conectada</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Del dato en terreno a la decisión</h2>
              <p className="mt-3 text-muted-foreground">MOTIL organiza la evidencia desde la actividad operacional hasta la gestión, sin duplicar la verdad entre módulos.</p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              {[
                [BarChart3, 'Producción y desempeño'],
                [Wrench, 'OT y activos'],
                [Package, 'Repuestos e inventario'],
                [ShieldCheck, 'Seguridad y cumplimiento'],
              ].map(([Icon, label]: any) => <div key={label} className="flex items-center gap-3 bg-background p-4"><Icon className="h-4 w-4 text-primary"/><span className="text-sm font-medium">{label}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Software de gestión minera en Chile</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Más arriba que un ERP minero</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">MOTIL no se posiciona sólo como software de gestión o ERP. Es un Sistema Operativo para Minería: conecta la operación, las personas, los activos, la evidencia y la decisión bajo una misma arquitectura. Las categorías “software minero”, “software de gestión minera” y “ERP minero” describen partes del problema; MOTIL describe la capa completa.</p>
          <Link href="/mineria-chile" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Ver Sistemas Operativos para Minería en Chile <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight">MOTIL Mining OS</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Sistema Operativo para Minería desarrollado por Neuralia en Chile.</p>
          <Button asChild size="lg" className="mt-7 gap-2"><Link href="/auth/login">Ingresar a MOTIL <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>

      <footer className="border-t border-border"><div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">MOTIL Mining OS 2026 · Neuralia · Chile</div></footer>
    </main>
  );
}
