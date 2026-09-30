'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CalendarDays, FileCheck2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar HSE');
  return payload;
};

export default function PrevencionRiesgosPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/hse/overview', fetcher, { revalidateOnFocus: false });

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando HSE" description="Leyendo documentos canónicos, compromisos, inspecciones y calendario." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="HSE no disponible" description="No se reemplazan fuentes faltantes por ceros." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} />;
  }

  const summary = data.summary || {};
  const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Seguridad y salud</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Prevención de Riesgos</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Documentos, compromisos, inspecciones y acciones HSE conectados a una sola operación.</p>
        </div>
        <Button asChild><Link href="/dashboard/tareas"><CalendarDays className="mr-2 h-4 w-4" />Calendario organización</Link></Button>
      </header>

      {data.warnings?.length ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          {data.warnings.join(' ')}
        </div>
      ) : null}

      <section className="grid overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Documentos canónicos', summary.canonicalDocuments ?? '—'],
          ['Compromisos', summary.commitments ?? '—'],
          ['Inspecciones', typeof summary.internalInspections === 'number' && typeof summary.externalInspections === 'number' ? summary.internalInspections + summary.externalInspections : '—'],
          ['Eventos calendario', summary.calendarEvents ?? '—'],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-5 py-4 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse" className="rounded-lg border p-4 hover:bg-muted/30">
          <FileCheck2 className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Documentos HSE</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.canonicalDocuments ?? '—'} fuentes canónicas activas.</p>
        </Link>
        <Link href="/dashboard/sostenibilidad/prevencion-riesgos/compromisos" className="rounded-lg border p-4 hover:bg-muted/30">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Compromisos</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.commitments ?? '—'} registros con provenance desde archivo fuente.</p>
        </Link>
        <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones" className="rounded-lg border p-4 hover:bg-muted/30">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Inspecciones</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.internalInspections ?? '—'} internas · {summary.externalInspections ?? '—'} externas.</p>
        </Link>
        <Link href="/dashboard/tareas" className="rounded-lg border p-4 hover:bg-muted/30">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Calendario organización</p>
          <p className="mt-1 text-xs text-muted-foreground">HSE, Legal, Mantenimiento y Abastecimiento en una sola agenda.</p>
        </Link>
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Próximas acciones HSE</h2>
            <p className="text-sm text-muted-foreground">Eventos con fecha real ya registrados en la organización.</p>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/dashboard/tareas">Ver calendario <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        <div className="divide-y overflow-hidden rounded-lg border">
          {upcoming.length ? upcoming.map((event: any) => (
            <Link key={event.id} href="/dashboard/tareas" className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{event.event_type}</Badge>
                  <p className="text-sm font-medium">{event.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{event.responsible_person_name || 'Responsable sin asignar'}{event.location ? ` · ${event.location}` : ''}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{event.due_date}</span>
            </Link>
          )) : <p className="px-4 py-4 text-sm text-muted-foreground">No hay acciones HSE futuras con fecha registrada.</p>}
        </div>
      </section>
    </div>
  );
}
