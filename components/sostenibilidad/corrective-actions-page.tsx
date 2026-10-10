'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Upload } from 'lucide-react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CorrectiveActionCard } from '@/components/sostenibilidad/corrective-action-card';
import { CorrectiveActionModal } from '@/components/sostenibilidad/corrective-action-modal';
import type { CorrectiveActionRecord } from '@/components/sostenibilidad/nonconformance-types';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar las acciones correctivas');
  return payload;
};

function formatDate(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function CorrectiveActionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const ncId = searchParams.get('ncId');

  const { data: actions, error: actionsError, isLoading: actionsLoading, mutate } = useSWR(
    ncId ? `/api/sostenibilidad/corrective-actions?ncId=${ncId}` : '/api/sostenibilidad/corrective-actions',
    fetcher
  );

  const actionList: CorrectiveActionRecord[] = Array.isArray(actions?.data) ? actions.data : [];
  const inProgressCount = actionList.filter((a) => a.status === 'in_progress').length;
  const completedCount = actionList.filter((a) => a.status === 'completed' || a.status === 'verified').length;
  const overDueCount =
    actionList.filter((a) => {
      const dueDate = formatDate(a.scheduled_completion_date);
      return Boolean(dueDate) && new Date(dueDate) < new Date() && !['completed', 'verified'].includes(a.status);
    }).length;
  const totalActions = actionList.length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Acciones correctivas</h1>
          <p className="text-muted-foreground">Responsables, plazos y evidencia de las acciones registradas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button onClick={() => setModalOpen(true)} className="bg-primary" variant="default" disabled={!ncId}>
            <Plus className="mr-2 h-4 w-4" />
            {ncId ? 'Nueva acción' : 'Selecciona una NC'}
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          {!ncId ? (
            <>
              <p>Selecciona una no conformidad para registrar una acción vinculada al hallazgo.</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/sostenibilidad/prevencion-riesgos/no-conformidades">Ver no conformidades</Link>
              </Button>
            </>
          ) : (
            <p>
              Trabajando sobre la no conformidad <span className="font-mono font-medium text-foreground">{ncId}</span>.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions ? inProgressCount : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions ? completedCount : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{actions ? overDueCount : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!actions ? '—' : totalActions ? `${Math.round((completedCount / totalActions) * 100)}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {actionsError ? <StatePanel tone="error" title="Acciones correctivas no disponibles" description="No se puede confirmar el estado de las acciones. Revisa la fuente antes de tomar decisiones." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} /> : null}
      {actionsLoading ? <StatePanel tone="loading" title="Cargando acciones correctivas" /> : null}
      {!actionsError && !actionsLoading ? <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {actionList
              .filter((a) => ['planned', 'in_progress'].includes(a.status))
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {actionList
              .filter((a) => ['completed', 'verified'].includes(a.status))
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {actionList
              .filter((a) => {
                const dueDate = formatDate(a.scheduled_completion_date);
                return Boolean(dueDate) && new Date(dueDate) < new Date() && !['completed', 'verified'].includes(a.status);
              })
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>
      </Tabs> : null}

      <CorrectiveActionModal open={modalOpen} onOpenChange={setModalOpen} ncId={ncId} onCreate={() => mutate()} />
    </div>
  );
}
