'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';

type ContractOption = {
  id: string;
  contract_number: string | null;
  title: string | null;
  contractor_name: string | null;
  status: string | null;
};

type EvidenceOption = {
  id: string;
  document_name: string;
  document_code: string | null;
  status: string | null;
  canonical_role: string | null;
  provenance_status: string | null;
};

type ProgressItem = {
  id: string;
  period_start: string | null;
  period_end: string | null;
  execution_percentage: number;
  progress_note: string | null;
  evidence_document_id: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string;
  review_note: string | null;
  contract: {
    id: string;
    contract_number: string | null;
    title: string | null;
    contractor_name: string | null;
    paid_percentage: number | null;
    current_execution_percentage: number | null;
  } | null;
  evidence: {
    id: string;
    document_name: string;
    document_code: string | null;
    status: string | null;
  } | null;
};

type Payload = {
  data: ProgressItem[];
  contracts: ContractOption[];
  evidenceOptions: EvidenceOption[];
  accessLevel: 'ED' | 'LEC';
  schemaReady: boolean;
  summary: {
    total: number;
    submitted: number;
    approved: number;
    rejected: number;
    without_evidence: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la bitácora de avances');
  return payload;
};

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1)}%`;
}

export default function ContractorProgressPage() {
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/legal/contract-progress', fetcher, {
    revalidateOnFocus: false,
  });

  const [contractId, setContractId] = useState('');
  const [executionPercentage, setExecutionPercentage] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [evidenceDocumentId, setEvidenceDocumentId] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando avances" description="Leyendo contratos, evidencia y revisiones." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="Avances no disponibles" description="La bitácora no se reemplaza por datos simulados." />;
  }

  const canWrite = data.accessLevel === 'ED' && data.schemaReady;

  const submitProgress = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await fetch('/api/legal/contract-progress', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          execution_percentage: Number(executionPercentage),
          period_start: periodStart || null,
          period_end: periodEnd || null,
          evidence_document_id: evidenceDocumentId || null,
          progress_note: progressNote || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionMessage(payload?.error || 'No se pudo registrar el avance.');
        return;
      }
      setContractId('');
      setExecutionPercentage('');
      setPeriodStart('');
      setPeriodEnd('');
      setEvidenceDocumentId('');
      setProgressNote('');
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await fetch('/api/legal/contract-progress', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionMessage(payload?.error || 'No se pudo revisar el avance.');
        return;
      }
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · Contratistas</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Avances de contratos</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Bitácora trazable de avance físico, evidencia y aprobación antes de consolidar el porcentaje contractual.
        </p>
      </header>

      {!data.schemaReady ? (
        <StatePanel
          tone="warning"
          title="Bitácora preparada, pendiente de migración"
          description="La interfaz y el flujo están implementados en esta rama, pero la tabla contract_progress_updates aún no existe en producción."
          className="min-h-0"
        />
      ) : null}

      {actionMessage ? <StatePanel tone="warning" title="Acción no aplicada" description={actionMessage} className="min-h-0" /> : null}

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-5">
        {[
          ['Avances', data.summary.total],
          ['En revisión', data.summary.submitted],
          ['Aprobados', data.summary.approved],
          ['Rechazados', data.summary.rejected],
          ['Sin evidencia', data.summary.without_evidence],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {data.accessLevel === 'ED' ? (
        <form onSubmit={submitProgress} className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Contrato</label>
            <Select value={contractId} onValueChange={setContractId} disabled={!canWrite}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar contrato" />
              </SelectTrigger>
              <SelectContent>
                {data.contracts.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {[item.contract_number, item.title, item.contractor_name].filter(Boolean).join(' · ') || item.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Avance físico (%)</label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={executionPercentage}
              onChange={(event) => setExecutionPercentage(event.target.value)}
              disabled={!canWrite}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Inicio del período</label>
            <Input className="mt-1" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} disabled={!canWrite} />
          </div>

          <div>
            <label className="text-sm font-medium">Fin del período</label>
            <Input className="mt-1" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} disabled={!canWrite} />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Evidencia canónica</label>
            <Select value={evidenceDocumentId} onValueChange={setEvidenceDocumentId} disabled={!canWrite}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar documento Legal" />
              </SelectTrigger>
              <SelectContent>
                {data.evidenceOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {[item.document_code, item.document_name].filter(Boolean).join(' · ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              La aprobación requiere evidencia vinculada al núcleo documental.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Nota de avance</label>
            <Input className="mt-1" value={progressNote} onChange={(event) => setProgressNote(event.target.value)} disabled={!canWrite} />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={!canWrite || saving || !contractId || !executionPercentage}>
              Registrar avance
            </Button>
          </div>
        </form>
      ) : null}

      <section className="divide-y overflow-hidden rounded-md border">
        {data.data.length ? data.data.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.status}</Badge>
                  <Badge variant="secondary">{pct(item.execution_percentage)} avance</Badge>
                  {!item.evidence_document_id ? <Badge variant="destructive">Sin evidencia</Badge> : null}
                </div>
                <h2 className="mt-2 text-sm font-semibold">
                  {item.contract?.title || item.contract?.contract_number || 'Contrato'}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.contract?.contractor_name || 'Contratista no informado'}
                </p>
                {item.progress_note ? <p className="mt-2 text-sm">{item.progress_note}</p> : null}
              </div>

              <div className="text-xs text-muted-foreground md:text-right">
                <p>{item.period_start || '—'} → {item.period_end || '—'}</p>
                <p className="mt-1">Pago: {pct(item.contract?.paid_percentage)}</p>
                <p className="mt-1">Avance consolidado: {pct(item.contract?.current_execution_percentage)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                Evidencia: {item.evidence?.document_name || 'No vinculada'}
              </span>
              {canWrite && item.status === 'submitted' ? (
                <>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void review(item.id, 'approved')}>
                    Aprobar
                  </Button>
                  <Button size="sm" variant="ghost" disabled={saving} onClick={() => void review(item.id, 'rejected')}>
                    Rechazar
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        )) : (
          <p className="p-4 text-sm text-muted-foreground">
            No hay avances contractuales registrados.
          </p>
        )}
      </section>
    </div>
  );
}
