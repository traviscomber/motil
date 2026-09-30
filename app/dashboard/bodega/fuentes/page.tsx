'use client';

import useSWR from 'swr';
import { Database, FileSpreadsheet, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

type Source = {
  sourceFile: string;
  kind: 'canonical_file' | 'operational_baseline' | 'test';
  rows: number;
  firstImportedAt: string | null;
  lastImportedAt: string | null;
  canonical: boolean;
};

type Response = {
  data: Source[];
  summary: {
    sources: number;
    canonicalFiles: number;
    operationalBaselines: number;
    excludedTests: number;
    productRows: number;
    inventoryRows: number;
  };
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las fuentes de Bodega');
  return payload as Response;
};

const kindMeta = {
  canonical_file: { label: 'Fuente canónica', icon: FileSpreadsheet },
  operational_baseline: { label: 'Baseline operacional', icon: Database },
  test: { label: 'Prueba excluida', icon: FlaskConical },
} as const;

export default function WarehouseSourcesPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/bodega/sources', fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Cargando fuentes de Bodega" description="Reconstruyendo provenance desde productos e inventario canónicos." />;
  if (error || !data) return <StatePanel tone="error" title="Fuentes de Bodega no disponibles" description="No se reemplaza provenance faltante por una lista vacía." />;

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Bodega · Provenance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Fuentes</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Archivos y baselines que alimentan productos e inventario. Las fuentes de prueba permanecen visibles como evidencia, pero no se cuentan como canónicas productivas.
        </p>
      </header>

      <section className="grid overflow-hidden rounded-lg border sm:grid-cols-5">
        {[
          ['Fuentes', data.summary.sources],
          ['Archivos canónicos', data.summary.canonicalFiles],
          ['Baselines', data.summary.operationalBaselines],
          ['Filas producto', data.summary.productRows],
          ['Inventario vigente', data.summary.inventoryRows],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{Number(value).toLocaleString('es-CL')}</p>
          </div>
        ))}
      </section>

      <section className="divide-y overflow-hidden rounded-lg border">
        {data.data.map((source) => {
          const meta = kindMeta[source.kind];
          const Icon = meta.icon;
          return (
            <article key={source.sourceFile} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="break-all text-sm font-semibold">{source.sourceFile}</h2>
                    <Badge variant={source.kind === 'test' ? 'outline' : 'secondary'}>{meta.label}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {source.rows.toLocaleString('es-CL')} filas preservadas
                    {source.lastImportedAt ? ` · última importación ${new Date(source.lastImportedAt).toLocaleDateString('es-CL')}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {source.kind === 'canonical_file' ? 'Aceptada como fuente del modelo canónico' : source.kind === 'test' ? 'No productiva' : 'Origen operacional preservado'}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
