'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Upload } from 'lucide-react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CorrectiveActionCard } from '@/components/sostenibilidad/corrective-action-card';
import { CorrectiveActionModal } from '@/components/sostenibilidad/corrective-action-modal';
import type { CorrectiveActionRecord } from '@/components/sostenibilidad/nonconformance-types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDate(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function CorrectiveActionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const ncId = searchParams.get('ncId');

  const { data: stats } = useSWR('/api/sostenibilidad/corrective-actions/stats', fetcher);
  const { data: actions, mutate } = useSWR(
    ncId ? `/api/sostenibilidad/corrective-actions?ncId=${ncId}` : '/api/sostenibilidad/corrective-actions',
    fetcher
  );

  const actionList: CorrectiveActionRecord[] = Array.isArray(actions?.data) ? actions.data : [];
  const statsData: Record<string, number> =
    stats?.data && typeof stats.data === 'object' ? (stats.data as Record<string, number>) : {};

  const inProgressCount = actionList.filter((a) => a.status === 'in_progress').length || 0;
  const completedCount = actionList.filter((a) => a.status === 'completed' || a.status === 'verified').length || 0;
  const overDueCount =
    actionList.filter((a) => {
      const dueDate = formatDate(a.scheduled_completion_date);
      return Boolean(dueDate) && new Date(dueDate) < new Date() && a.status !== 'completed';
    }).length || 0;
  const totalActions = actionList.length || 0;

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
            <div className="text-2xl font-bold">{inProgressCount || statsData.in_progress || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount || statsData.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overDueCount || statsData.overdue || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalActions ? Math.round((completedCount / totalActions) * 100) : statsData?.completionRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
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
                return Boolean(dueDate) && new Date(dueDate) < new Date() && a.status !== 'completed';
              })
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <CorrectiveActionModal open={modalOpen} onOpenChange={setModalOpen} ncId={ncId} onCreate={() => mutate()} />
    </div>
  );
}
