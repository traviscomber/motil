'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

type LegalCase = {
  id: string;
  source_type: string;
  source_module: string;
  title: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  operational_owner: string | null;
  legal_owner: string | null;
  due_at: string | null;
  status: 'new' | 'in_review' | 'action_required' | 'waiting_area' | 'closed';
  action_required: string | null;
  evidence_status: 'pending' | 'partial' | 'complete' | 'not_required';
  source_href: string | null;
};

type CasesResponse = {
  data: LegalCase[];
  accessLevel: 'ED' | 'LEC';
  canWrite: boolean;
  summary: {
    total: number;
    new: number;
    in_review: number;
    action_required: number;
    waiting_area: number;
    closed: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los casos');
  return payload;
};

const STATUS_LABEL: Record<LegalCase['status'], string> = {
  new: 'Nuevo',
  in_review: 'En revisión',
  action_required: 'Acción requerida',
  waiting_area: 'Esperando área',
  closed: 'Cerrado',
};

export default function LegalCasesPage() {
  const [syncing, setSyncing] = useState(false);
  const [savingCaseId, setSavingCaseId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<CasesResponse>('/api/legal/cases', fetcher, {
    revalidateOnFocus: false,
  });

  const sync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/legal/cases/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
      });
      await mutate();
    } finally {
      setSyncing(false);
    }
  };

  const updateCase = async (id: string, patch: Record<string, string>) => {
    setSavingCaseId(id);
    setActionMessage(null);
    try {
      const response = await fetch('/api/legal/cases', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionMessage(payload?.error || 'No se pudo actualizar el caso Legal.');
        return;
      }
      await mutate();
    } finally {
      setSavingCaseId(null);
    }
  };

  useEffect(() => {
    if (data?.canWrite) void sync();
    // Sync once only after confirming the current Legal role can write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.canWrite]);

  const openCases = useMemo(
    () => (data?.data || []).filter((item) => item.status !== 'closed'),
    [data?.data],
  );

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando casos legales" description="Sincronizando señales operacionales y plazos." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="Casos legales no disponibles" description="La fuente no se reemplaza por una bandeja vacía." />;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · Trabajo operacional</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Casos</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Señales de otras áreas convertidas en trabajo Legal, sin quitar ownership al responsable operacional.
          </p>
        </div>
        {data.canWrite ? <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button> : null}
      </header>

      {actionMessage ? <StatePanel tone="warning" title="Acción Legal no aplicada" description={actionMessage} className="min-h-0" /> : null}

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-5">
        {[
          ['Nuevos', data.summary.new],
          ['En revisión', data.summary.in_review],
          ['Acción requerida', data.summary.action_required],
          ['Esperando área', data.summary.waiting_area],
          ['Cerrados', data.summary.closed],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="divide-y overflow-hidden rounded-md border">
        {openCases.length ? openCases.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.source_module}</Badge>
                  <Badge variant="secondary">{STATUS_LABEL[item.status]}</Badge>
                  <Badge variant={item.priority === 'critical' ? 'destructive' : 'outline'}>{item.priority}</Badge>
                </div>
                <h2 className="mt-2 text-sm font-semibold">{item.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                {item.action_required ? <p className="mt-2 text-sm">{item.action_required}</p> : null}
              </div>
              <div className="shrink-0 text-xs text-muted-foreground md:text-right">
                <p>{item.due_at || 'Sin plazo registrado'}</p>
                <p className="mt-1">{item.operational_owner || 'Dueño operacional sin asignar'}</p>
                <p className="mt-1">{item.legal_owner || 'Legal sin persona asignada'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              {item.source_href ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={item.source_href}>Ver fuente <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              ) : null}

              <Badge variant="outline">
                Evidencia: {item.evidence_status === 'complete' ? 'completa' : item.evidence_status === 'not_required' ? 'no requerida' : item.evidence_status === 'partial' ? 'parcial' : 'pendiente'}
              </Badge>

              {data.canWrite && item.status === 'new' ? (
                <Button size="sm" variant="outline" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { status: 'in_review' })}>
                  Iniciar revisión
                </Button>
              ) : null}

              {data.canWrite && item.status === 'in_review' ? (
                <>
                  <Button size="sm" variant="outline" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { status: 'action_required' })}>
                    Pedir acción
                  </Button>
                  <Button size="sm" variant="outline" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { status: 'waiting_area' })}>
                    Esperar área
                  </Button>
                </>
              ) : null}

              {data.canWrite && (item.status === 'action_required' || item.status === 'waiting_area') ? (
                <Button size="sm" variant="outline" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { status: 'in_review' })}>
                  Retomar revisión
                </Button>
              ) : null}

              {data.canWrite && !['complete', 'not_required'].includes(item.evidence_status) ? (
                <>
                  <Button size="sm" variant="ghost" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { evidence_status: 'complete' })}>
                    Evidencia completa
                  </Button>
                  <Button size="sm" variant="ghost" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { evidence_status: 'not_required' })}>
                    No requerida
                  </Button>
                </>
              ) : null}

              {data.canWrite && item.status !== 'new' && ['complete', 'not_required'].includes(item.evidence_status) ? (
                <Button size="sm" disabled={savingCaseId === item.id} onClick={() => void updateCase(item.id, { status: 'closed' })}>
                  Cerrar caso
                </Button>
              ) : null}
            </div>
          </article>
        )) : (
          <p className="p-4 text-sm text-muted-foreground">No hay casos legales abiertos en las fuentes disponibles.</p>
        )}
      </section>
    </div>
  );
}
