'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { formatWorkOrderNumber } from '@/lib/maintenance/work-order-display';
import type { Locale } from '@/lib/i18n/dictionaries';

type TerrainAction = {
  id: string;
  workOrderNumber: string;
  title: string;
  evidence: string;
  href: string;
  actionLabel: 'Iniciar' | 'Reanudar';
  stateLabel: string;
  priority?: string | null;
  scheduledDate?: string | null;
  status?: string | null;
  timerStatus?: string | null;
};

type TerrainResponse = { actions?: TerrainAction[]; identityLinked?: boolean; canCreateWorkOrder?: boolean };

async function fetcher(url: string): Promise<TerrainResponse> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar tu trabajo.');
  return payload as TerrainResponse;
}

function priorityLabel(value: string | null | undefined, locale: Locale) {
  const priority = String(value || '').toLowerCase();
  const en = locale === 'en';
  if (priority === 'critical') return en ? 'Critical' : 'Crítica';
  if (priority === 'high') return en ? 'High' : 'Alta';
  if (priority === 'medium') return en ? 'Medium' : 'Media';
  if (priority === 'low') return en ? 'Low' : 'Baja';
  return value || '';
}

function actionState(action: TerrainAction, locale: Locale) {
  const timer = String(action.timerStatus || '').toLowerCase();
  const status = String(action.status || '').toLowerCase();
  const en = locale === 'en';
  if (timer === 'running') return { label: en ? 'In progress' : 'En curso', action: en ? 'Open' : 'Abrir' };
  if (timer === 'paused') return { label: en ? 'Paused' : 'Pausada', action: en ? 'Resume' : 'Reanudar' };
  if (status === 'in_progress') return { label: en ? 'Resume' : 'Por reanudar', action: en ? 'Resume' : 'Reanudar' };
  return { label: en ? 'Pending' : 'Pendiente', action: en ? 'Start' : 'Iniciar' };
}

export function MobileTerrainPanel({ locale }: { locale: Locale }) {
  const { data, error, isLoading, mutate } = useSWR<TerrainResponse>(
    '/api/maintenance/my-work',
    fetcher,
    { revalidateOnFocus: true },
  );
  const actions = data?.actions || [];
  const identityLinked = data?.identityLinked !== false;
  const copy = locale === 'en'
    ? {
        section: 'Maintenance',
        title: 'Today’s work',
        active: (count: number) => `${count} active WO${count === 1 ? '' : 's'} assigned`,
        newOrder: 'New WO',
        refresh: 'Refresh work',
        loading: 'Finding your assigned work',
        loadError: 'Could not load work',
        retry: 'Retry',
        unlinkedTitle: 'Profile not linked yet',
        unlinkedDescription: 'Your user is not yet linked to a canonical operational person. Planning or leadership must complete that assignment before assigning a work order.',
        emptyTitle: 'No assigned work',
        emptyDescription: 'When an active work order is assigned to you, it will appear here.',
        firstPriority: 'First priority',
        scheduled: 'Scheduled',
        noDate: 'No scheduled date',
        priority: 'Priority',
        footnote: 'You can have multiple assigned work orders. Work in progress or paused work appears first so you can resume it from this list.',
      }
    : {
        section: 'Mantenimiento',
        title: 'Trabajo de hoy',
        active: (count: number) => `${count} OT${count === 1 ? '' : 's'} activa${count === 1 ? '' : 's'} asignada${count === 1 ? '' : 's'}`,
        newOrder: 'Nueva OT',
        refresh: 'Actualizar trabajo',
        loading: 'Buscando tu trabajo asignado',
        loadError: 'No se pudo cargar el trabajo',
        retry: 'Reintentar',
        unlinkedTitle: 'Perfil aún no vinculado',
        unlinkedDescription: 'Tu usuario todavía no está asociado a una persona operativa canónica. Jefatura o planificación debe completar esa asignación antes de entregarte una OT.',
        emptyTitle: 'No tienes trabajo asignado',
        emptyDescription: 'Cuando te asignen una OT activa, aparecerá aquí.',
        firstPriority: 'Primera prioridad',
        scheduled: 'Programada',
        noDate: 'Sin fecha programada',
        priority: 'Prioridad',
        footnote: 'Puedes tener varias OTs asignadas. Las que están en curso o pausadas aparecen primero y puedes retomarlas desde esta lista.',
      };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 py-1" aria-label={copy.title}>
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.section}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{copy.title}</h1>
          {!isLoading && !error && identityLinked ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.active(actions.length)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {data?.canCreateWorkOrder ? (
            <Button asChild>
              <Link href="/dashboard/mantenimiento/ordenes-trabajo/create">
                <Plus className="h-4 w-4" />
                {copy.newOrder}
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={copy.refresh}
            onClick={() => void mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </header>

      {isLoading ? <StatePanel tone="loading" title={copy.loading} className="min-h-48" /> : null}
      {error ? <StatePanel tone="error" title={copy.loadError} description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>{copy.retry}</Button>} /> : null}
      {!isLoading && !error && !identityLinked ? <StatePanel tone="warning" title={copy.unlinkedTitle} description={copy.unlinkedDescription} className="min-h-48" /> : null}
      {!isLoading && !error && identityLinked && actions.length === 0 ? <StatePanel tone="neutral" title={copy.emptyTitle} description={copy.emptyDescription} className="min-h-48" /> : null}

      {!isLoading && !error && identityLinked && actions.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {actions.map((action, index) => {
            const state = actionState(action, locale);
            const date = action.scheduledDate
              ? new Date(`${action.scheduledDate}T00:00:00`).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CL')
              : null;
            const evidence = `${date ? `${copy.scheduled} ${date}` : copy.noDate}${action.priority ? ` · ${copy.priority} ${priorityLabel(action.priority, locale)}` : ''}`;
            return (
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
                  <span className="font-mono text-xs text-muted-foreground">{formatWorkOrderNumber(action.workOrderNumber, locale)}</span>
                  <Badge variant={state.label === (locale === 'en' ? 'In progress' : 'En curso') ? 'default' : state.label === (locale === 'en' ? 'Paused' : 'Pausada') ? 'secondary' : 'outline'}>
                    {state.label}
                  </Badge>
                  {index === 0 ? <span className="text-xs text-muted-foreground">{copy.firstPriority}</span> : null}
                </div>
                <p className="mt-1 font-medium">{action.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{evidence}</p>
              </div>
              <span className="inline-flex items-center justify-end gap-2 text-sm font-medium">
                {state.action}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )})}
        </div>
      ) : null}

      <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
        {copy.footnote}
      </p>
    </section>
  );
}
