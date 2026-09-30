'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los compromisos HSE');
  return payload;
};

export default function HseCommitmentsPage() {
  const { data, error, isLoading } = useSWR('/api/hse/overview', fetcher, { revalidateOnFocus: false });
  if (isLoading) return <StatePanel tone="loading" title="Cargando compromisos" description="Reconstruyendo la información desde la fuente canónica." />;
  if (error || !data) return <StatePanel tone="error" title="Compromisos no disponibles" description="La fuente no se reemplaza por una lista vacía." />;

  const rows = Array.isArray(data.commitments) ? data.commitments : [];
  const orderedRows = [...rows].sort((a: any, b: any) => Number(Boolean(b.requiresOwner)) - Number(Boolean(a.requiresOwner)));

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">HSE · Evidencia canónica</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Compromisos</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Compromisos reconstruidos desde el archivo fuente aceptado. Los campos sin fecha permanecen fuera del calendario hasta contar con evidencia temporal real.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border">
        <div className="divide-y">
          {orderedRows.map((row: any) => (
            <article key={row.id} className="p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{row.commitmentId || 'Compromiso'}</Badge>
                    {row.component ? <Badge variant="outline">{row.component}</Badge> : null}
                    {row.projectStage ? <Badge variant="secondary">{row.projectStage}</Badge> : null}
                    {row.requiresOwner ? <Badge variant="destructive">Asignar responsable</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6">{row.description || 'Descripción no normalizada'}</p>
                  {row.requirement ? <p className="mt-1 text-xs text-muted-foreground">{row.requirement}</p> : null}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p>{row.responsible || 'Responsable no definido en fuente'}</p>
                  <p className="mt-1">{row.dueDate || 'Sin fecha registrada'}</p>
                </div>
              </div>

              {row.actionRequired ? <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"><span className="font-medium">Acción:</span> {row.actionRequired}</div> : null}

              <div className="mt-4 grid gap-3 border-t pt-3 text-xs md:grid-cols-3">
                <div>
                  <p className="font-medium text-foreground">Evidencia esperada</p>
                  <p className="mt-1 text-muted-foreground">{row.evidence || 'Sin evidencia normalizada'}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Seguimiento</p>
                  <p className="mt-1 text-muted-foreground">{row.tracking || 'Sin marca de seguimiento'}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Provenance</p>
                  <p className="mt-1 text-muted-foreground">{row.sourceFile || 'Fuente no identificada'}</p>
                </div>
              </div>
            </article>
          ))}
          {!rows.length ? <p className="p-4 text-sm text-muted-foreground">No hay compromisos canónicos disponibles.</p> : null}
        </div>
      </div>
    </div>
  );
}
