'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CalendarDays, FileCheck2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { SecondaryDetails } from '@/components/ui/secondary-details';

const eventLabels: Record<string, string> = { monitoring: 'Monitoreo', inspection: 'Inspección', legal: 'Legal', audit: 'Auditoría', training: 'Capacitación', meeting: 'Reunión' };

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
  const commitmentActions = Array.isArray(data.commitmentActions) ? data.commitmentActions : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Seguridad y salud</h1>
        </div>
        <Button asChild><Link href="/dashboard/tareas"><CalendarDays className="mr-2 h-4 w-4" />Abrir calendario</Link></Button>
      </header>

      {data.warnings?.length ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          {data.warnings.join(' ')}
        </div>
      ) : null}


      {commitmentActions.length ? (
        <section>
          <div className="mb-2">
            <h2 className="text-base font-semibold">Pendientes</h2>
          </div>
          <div className="divide-y overflow-hidden rounded-lg border">
            {commitmentActions.slice(0, 5).map((item: any) => (
              <div key={item.id} className="px-4 py-3">
                <Link href="/dashboard/sostenibilidad/prevencion-riesgos/compromisos" className="flex min-h-11 items-center justify-between gap-3 rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0 font-medium">{item.commitmentId}{item.component ? ` · ${item.component}` : ''}</span>
                  <span className="shrink-0 text-xs">Abrir<ArrowRight className="ml-2 inline h-4 w-4" /></span>
                </Link>
                {item.actionRequired ? <p className="mt-1 text-sm text-muted-foreground">{item.actionRequired}</p> : null}
                <details className="text-xs text-muted-foreground">
                  <summary className="min-h-11 cursor-pointer py-3">Ver detalle</summary>
                  <div className="space-y-2 pb-2"><p>{item.description}</p></div>
                </details>
              </div>
            ))}
          </div>
          <Button asChild variant="ghost" className="mt-2"><Link href="/dashboard/sostenibilidad/prevencion-riesgos/compromisos">Ver compromisos</Link></Button>
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Próximas acciones</h2>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/dashboard/tareas">Ver calendario <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        <div className="divide-y overflow-hidden rounded-lg border">
          {upcoming.length ? upcoming.slice(0, 3).map((event: any) => (
            <Link key={event.id} href="/dashboard/tareas" className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{eventLabels[event.event_type] || 'Evento'}</Badge>
                  <p className="text-sm font-medium">{event.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{event.responsible_person_name || 'Responsable sin asignar'}{event.location ? ` · ${event.location}` : ''}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{event.due_date}</span>
            </Link>
          )) : <p className="px-4 py-4 text-sm text-muted-foreground">No hay acciones HSE futuras con fecha registrada.</p>}
        </div>
      </section>
      <SecondaryDetails>
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
          <p className="mt-1 text-xs text-muted-foreground">{summary.commitments ?? '—'} registros · {summary.commitmentsUnassigned ?? '—'} requieren asignar responsable.</p>
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

      </SecondaryDetails>
    </div>
  );
}
