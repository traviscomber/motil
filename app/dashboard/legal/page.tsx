'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { SecondaryDetails } from '@/components/ui/secondary-details';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Legal');
  return payload;
};

type CompliancePayload = {
  summary?: {
    contracts_pending_review: number;
    expiring_contracts: number;
    contracts_missing_file: number;
    expiring_documents: number;
  };
  contracts_pending_review?: Array<{ id: string; title: string }>;
  expiring_contracts?: Array<{ id: string; title: string; days_until_expiry?: number }>;
  contracts_missing_file?: Array<{ id: string; title: string }>;
  expiring_documents?: Array<{ id: string; title: string; expiry_date?: string }>;
};

type CasesPayload = { summary?: { total: number; new: number; in_review: number; action_required: number; waiting_area: number; closed: number } };

type RegulatoryPayload = {
  summary?: {
    critical: number;
    withMatchedEvidence: number;
    withoutMatchedEvidence: number;
  };
};

export default function LegalPage() {
  const { data: complianceData, error: complianceError, isLoading: complianceLoading, mutate: mutateCompliance } = useSWR<CompliancePayload>(
    '/api/legal/compliance',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: casesData, error: casesError, isLoading: casesLoading, mutate: mutateCases } = useSWR<CasesPayload>(
    '/api/legal/cases',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: regulatoryData, error: regulatoryError, isLoading: regulatoryLoading, mutate: mutateRegulatory } = useSWR<RegulatoryPayload>(
    '/api/legal/sernageomin',
    fetcher,
    { revalidateOnFocus: false },
  );

  const compliance = complianceData?.summary;
  const regulatory = regulatoryData?.summary;
  const attention = [
    ...(complianceData?.contracts_pending_review || []).slice(0, 3).map((item) => ({
      id: `review-${item.id}`,
      title: item.title,
      detail: 'Contrato requiere revisión Legal',
      href: '/dashboard/documentos-gestion/contratos',
    })),
    ...(complianceData?.expiring_contracts || []).slice(0, 3).map((item) => ({
      id: `expiry-${item.id}`,
      title: item.title,
      detail: typeof item.days_until_expiry === 'number' ? `Vence en ${item.days_until_expiry} días` : 'Vencimiento próximo',
      href: '/dashboard/documentos-gestion/contratos',
    })),
    ...(complianceData?.expiring_documents || []).slice(0, 3).map((item) => ({
      id: `document-${item.id}`,
      title: item.title,
      detail: item.expiry_date ? `Documento vence ${item.expiry_date}` : 'Documento por vencer',
      href: '/dashboard/legal/documentos',
    })),
  ].slice(0, 5);

  const openCases = casesData?.summary ? casesData.summary.total - casesData.summary.closed : undefined;
  const attentionLoading = complianceLoading;
  const hasError = complianceError || regulatoryError || casesError;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Legal</h1>
        <Button asChild><Link href="/dashboard/legal/inbox">Abrir bandeja<ArrowRight className="h-4 w-4" /></Link></Button>
      </header>

      {hasError ? (
        <StatePanel
          tone="error"
          title="Parte del control Legal no pudo actualizarse"
          description="Revisa las fuentes antes de decidir."
          actions={<Button variant="outline" size="sm" onClick={() => { void mutateCompliance(); void mutateRegulatory(); void mutateCases(); }}>Reintentar</Button>}
          className="min-h-0"
        />
      ) : null}


      <section>
        <div className="mb-2">
          <h2 className="text-base font-semibold">Pendientes</h2>
        </div>
        <div className="divide-y overflow-hidden rounded-md border">
          {attentionLoading ? <p className="px-4 py-4 text-sm text-muted-foreground">Cargando pendientes…</p> : complianceError ? <p className="px-4 py-4 text-sm text-muted-foreground">Pendientes no disponibles.</p> : attention.length ? attention.map((item) => (
            <Link key={item.id} href={item.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          )) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">Sin contratos ni documentos pendientes en esta fuente.</p>
          )}
        </div>
      </section>

      <SecondaryDetails>
      <section className="grid overflow-hidden rounded-md border sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Casos abiertos', casesLoading || casesError ? '—' : openCases ?? '—'],
          ['Contratos por revisar', complianceLoading || complianceError ? '—' : compliance?.contracts_pending_review ?? '—'],
          ['Contratos por vencer', complianceLoading || complianceError ? '—' : compliance?.expiring_contracts ?? '—'],
          ['Documentos por vencer', complianceLoading || complianceError ? '—' : compliance?.expiring_documents ?? '—'],
          ['Señales regulatorias', regulatoryLoading || regulatoryError ? '—' : regulatory?.withMatchedEvidence ?? '—'],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

        <p className="text-xs text-muted-foreground">Los indicadores resumen sus fuentes; no acreditan cumplimiento legal.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/legal/sernageomin">Obligaciones</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/documentos-gestion/contratos">Contratos</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/legal/documentos">Documentos</Link></Button>
        </div>
      </SecondaryDetails>
    </div>
  );
}
