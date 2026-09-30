'use client';

import useSWR from 'swr';
import { Database, FileSpreadsheet, FlaskConical, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

type Source = {
  sourceFile: string;
  kind: 'canonical_file' | 'operational_baseline' | 'system_generated' | 'test';
  rows: number;
  domains: string[];
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
    systemGenerated: number;
    excludedTests: number;
    canonicalPurchaseOrders: number;
    canonicalSuppliers: number;
    documentCoreRecords: number;
  };
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las fuentes de Compras');
  return payload as Response;
};

const kindMeta = {
  canonical_file: { label: 'Fuente canónica', icon: FileSpreadsheet },
  operational_baseline: { label: 'Baseline operacional', icon: Database },
  system_generated: { label: 'Sistema', icon: Settings2 },
  test: { label: 'Prueba excluida', icon: FlaskConical },
} as const;

function domainLabel(value: string) {
  return value === 'purchase_orders' ? 'Órdenes de compra' : value === 'suppliers' ? 'Proveedores' : value;
}

export default function ProcurementSourcesPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/procurement/sources', fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Cargando fuentes de Compras" description="Reconstruyendo provenance desde OC y proveedores canónicos." />;
  if (error || !data) return <StatePanel tone="error" title="Fuentes de Compras no disponibles" description="No se reemplaza provenance faltante por una lista vacía." />;

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Compras · Provenance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Fuentes</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Origen verificable de órdenes de compra y proveedores. Una tabla histórica se muestra como baseline, no como archivo canónico si el archivo original no está preservado.
        </p>
      </header>

      <section className="grid overflow-hidden rounded-lg border sm:grid-cols-4">
        {[
          ['OC canónicas', data.summary.canonicalPurchaseOrders],
          ['Proveedores canónicos', data.summary.canonicalSuppliers],
          ['Fuentes identificadas', data.summary.sources],
          ['Documentos Compras', data.summary.documentCoreRecords],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{Number(value).toLocaleString('es-CL')}</p>
          </div>
        ))}
      </section>

      {data.summary.canonicalFiles === 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium">El modelo canónico existe, pero no conserva hoy el archivo Excel original de Compras.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            La provenance disponible apunta a baselines de base de datos. MOTIL no los presenta como archivos entregados.
          </p>
        </div>
      ) : null}

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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {source.domains.map((domain) => <Badge key={domain} variant="outline">{domainLabel(domain)}</Badge>)}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {source.rows.toLocaleString('es-CL')} registros preservados
                    {source.lastImportedAt ? ` · última importación ${new Date(source.lastImportedAt).toLocaleDateString('es-CL')}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {source.kind === 'canonical_file'
                    ? 'Archivo aceptado como fuente canónica'
                    : source.kind === 'system_generated'
                      ? 'Origen generado por MOTIL'
                      : source.kind === 'test'
                        ? 'No productiva'
                        : 'Origen operacional preservado'}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
