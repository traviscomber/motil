'use client';

import useSWR from 'swr';
import { Database, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

type Source = {
  sourceType: string;
  sourceReference: string;
  people: number;
  active: number;
  lastUpdatedAt: string | null;
};

type Response = {
  data: Source[];
  summary: {
    sources: number;
    people: number;
    activePeople: number;
  };
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las fuentes de RRHH');
  return payload as Response;
};

export default function RrhhSourcesPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/rrhh/sources', fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Cargando fuentes de Personas" description="Leyendo provenance de la identidad laboral canónica." />;
  if (error || !data) return <StatePanel tone="error" title="Fuentes de RRHH no disponibles" description="No se reemplaza provenance faltante por una fuente inventada." />;

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Personas · Provenance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Fuentes</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Origen de las fichas laborales canónicas. Una referencia operacional se conserva como tal y no se presenta como archivo si no existe un archivo fuente acreditado.
        </p>
      </header>

      <section className="grid overflow-hidden rounded-lg border sm:grid-cols-3">
        {[
          ['Fuentes', data.summary.sources],
          ['Personas canónicas', data.summary.people],
          ['Activas', data.summary.activePeople],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{Number(value).toLocaleString('es-CL')}</p>
          </div>
        ))}
      </section>

      <section className="divide-y overflow-hidden rounded-lg border">
        {data.data.map((source) => (
          <article key={`${source.sourceType}:${source.sourceReference}`} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <h2 className="break-all text-sm font-semibold">{source.sourceReference}</h2>
                  <Badge variant="secondary">{source.sourceType}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {source.people.toLocaleString('es-CL')} personas · {source.active.toLocaleString('es-CL')} activas
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UsersRound className="h-4 w-4" />
                <span>{source.lastUpdatedAt ? new Date(source.lastUpdatedAt).toLocaleDateString('es-CL') : 'Sin fecha de actualización'}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
