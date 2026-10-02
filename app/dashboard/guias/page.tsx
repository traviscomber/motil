import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const guides = [
  {
    title: 'Mantenimiento',
    description: 'Órdenes de trabajo, planificación y ejecución.',
    href: '/dashboard/mantenimiento',
  },
  {
    title: 'Bodega',
    description: 'Inventario, movimientos y fuentes.',
    href: '/dashboard/bodega',
  },
  {
    title: 'Alertas',
    description: 'Señales operacionales que requieren revisión.',
    href: '/dashboard/alertas',
  },
  {
    title: 'Reportes',
    description: 'Exportaciones operacionales y estado documental.',
    href: '/dashboard/reportes',
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ayuda</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Guías</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Accesos rápidos a los flujos principales de Motil. Cada módulo conserva su ayuda y contexto operacional.
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border">
        <div className="divide-y">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/30"
            >
              <div>
                <h2 className="text-sm font-semibold">{guide.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{guide.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        La ayuda evita procedimientos hard-coded: los pasos operacionales deben reflejar siempre la versión vigente del módulo.
      </p>
    </div>
  );
}
