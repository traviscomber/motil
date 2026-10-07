'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

type TerrainAction = {
  id: string;
  workOrderNumber: string;
  title: string;
  evidence: string;
  href: string;
  actionLabel: 'Iniciar' | 'Reanudar';
  stateLabel: string;
  priority?: string | null;
};

type TerrainResponse = { actions?: TerrainAction[]; identityLinked?: boolean; canCreateWorkOrder?: boolean };

async function fetcher(url: string): Promise<TerrainResponse> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar tu trabajo.');
  return payload as TerrainResponse;
}

export function MobileTerrainPanel() {
  const { data, error, isLoading, mutate } = useSWR<TerrainResponse>(
    '/api/maintenance/my-work',
    fetcher,
    { revalidateOnFocus: true },
  );
  const actions = data?.actions || [];
  const identityLinked = data?.identityLinked !== false;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 py-1" aria-label="Trabajo en terreno">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mantenimiento</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Trabajo de hoy</h1>
          {!isLoading && !error && identityLinked ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {actions.length} OT{actions.length === 1 ? '' : 's'} activa{actions.length === 1 ? '' : 's'} asignada{actions.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {data?.canCreateWorkOrder ? (
            <Button asChild>
              <Link href="/dashboard/mantenimiento/ordenes-trabajo/create">
                <Plus className="h-4 w-4" />
                Nueva OT
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Actualizar trabajo"
            onClick={() => void mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </header>

      {isLoading ? <StatePanel tone="loading" title="Buscando tu trabajo asignado" className="min-h-48" /> : null}
      {error ? <StatePanel tone="error" title="No se pudo cargar el trabajo" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} /> : null}
      {!isLoading && !error && !identityLinked ? <StatePanel tone="warning" title="Perfil aún no vinculado" description="Tu usuario todavía no está asociado a una persona operativa canónica. Jefatura o planificación debe completar esa asignación antes de entregarte una OT." className="min-h-48" /> : null}
      {!isLoading && !error && identityLinked && actions.length === 0 ? <StatePanel tone="neutral" title="No tienes trabajo asignado" description="Cuando te asignen una OT activa, aparecerá aquí." className="min-h-48" /> : null}

      {!isLoading && !error && identityLinked && actions.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {actions.map((action, index) => (
            <Link
              key={action.id}
              href={action.href}
              className="grid gap-3 border-b p-4 outline-none transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[44px_1fr_auto] sm:items-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{action.workOrderNumber}</span>
                  <Badge variant={action.stateLabel === 'En curso' ? 'default' : action.stateLabel === 'Pausada' ? 'secondary' : 'outline'}>
                    {action.stateLabel}
                  </Badge>
                  {index === 0 ? <span className="text-xs text-muted-foreground">Primera prioridad</span> : null}
                </div>
                <p className="mt-1 font-medium">{action.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.evidence}</p>
              </div>
              <span className="inline-flex items-center justify-end gap-2 text-sm font-medium">
                {action.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
        Puedes tener varias OTs asignadas. Las que están en curso o pausadas aparecen primero y puedes retomarlas desde esta lista.
      </p>
    </section>
  );
}
