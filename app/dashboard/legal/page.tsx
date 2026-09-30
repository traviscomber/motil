'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, Download, Eye, FileText, Scale, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';
import { ContractsTracker } from '@/components/legal/contracts-tracker';
import { AddDocumentModal } from '@/components/legal/add-document-modal';
import { DocumentReviewModal } from '@/components/legal/document-review-modal';
import { AddContractModal } from '@/components/legal/add-contract-modal';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la información');
  return payload;
};

type LegalDocument = {
  id: string;
  title: string;
  description: string;
  category: string;
  documentType: string;
  status: string;
  fileUrl: string | null;
  filePath: string | null;
};

type LegalContract = {
  id: string;
  title: string;
  contractor_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  contract_value: number;
  currency: string;
  compliance_status: string;
  file_url: string;
};

type CompliancePayload = {
  summary?: {
    total_contracts: number;
    active_contracts: number;
    contracts_pending_review: number;
    contracts_missing_file: number;
    expiring_contracts: number;
    expired_contracts: number;
    legal_documents: number;
    expiring_documents: number;
    approved_documents: number;
  };
  contracts_pending_review?: Array<{ id: string; title: string }>;
  contracts_missing_file?: Array<{ id: string; title: string }>;
  expiring_contracts?: Array<{ id: string; title: string; days_until_expiry: number }>;
  expiring_documents?: Array<{ id: string; title: string; expiry_date: string }>;
};

type FormPayload = Record<string, string | number | boolean | File | null | undefined>;

function getStatusBadge(status: string) {
  const value = String(status || '').toLowerCase();
  if (['active', 'vigente', 'approved'].includes(value)) return <Badge variant="secondary">Activo</Badge>;
  if (['pending', 'pendiente', 'draft', 'submitted', 'under_review'].includes(value)) return <Badge variant="outline">Pendiente</Badge>;
  if (['expired', 'vencido', 'rejected'].includes(value)) return <Badge variant="destructive">Vencido</Badge>;
  return <Badge variant="outline">{status || 'Sin estado'}</Badge>;
}

function mapContractStatus(status: string): 'active' | 'expiring' | 'expired' {
  const value = String(status || '').toLowerCase();
  if (value.includes('vencido')) return 'expired';
  if (value.includes('por vencer') || value.includes('revision') || value.includes('revisi')) return 'expiring';
  return 'active';
}

function mapApprovalStatus(status: string): 'pending' | 'approved' | 'rejected' {
  if (status === 'Pendiente') return 'pending';
  if (status === 'Incumplimiento') return 'rejected';
  return 'approved';
}

function formatContractValue(value: number, currency: string) {
  if (!value) return '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<LegalDocument | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const searchParam = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : '';
  const { data: documentData, error: documentsError, mutate: mutateDocuments } = useSWR(
    `/api/legal/documentos${searchParam}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: contractData, error: contractsError, mutate: mutateContracts } = useSWR(
    `/api/legal/contratos${searchParam}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: complianceData, error: complianceError, mutate: mutateCompliance } = useSWR(
    '/api/legal/compliance',
    fetcher,
    { revalidateOnFocus: false },
  );

  const legalDocs = (documentData?.documents || []) as LegalDocument[];
  const contracts = (contractData?.contracts || []) as LegalContract[];
  const compliance = (complianceData || {}) as CompliancePayload;
  const summary = compliance.summary;

  const compliancePercent = useMemo<number | null>(() => {
    if (!summary) return null;
    const checks: number[] = [];
    if (summary.total_contracts > 0) {
      checks.push(summary.active_contracts / summary.total_contracts);
      checks.push((summary.total_contracts - summary.contracts_missing_file) / summary.total_contracts);
    }
    if (summary.legal_documents > 0) {
      checks.push(summary.approved_documents / summary.legal_documents);
      checks.push((summary.legal_documents - summary.expiring_documents) / summary.legal_documents);
    }
    if (checks.length === 0) return null;
    return Math.round((checks.reduce((total, item) => total + Math.max(0, Math.min(1, item)), 0) / checks.length) * 100);
  }, [summary]);

  const complianceItems = useMemo<Array<[string, number | null]>>(() => {
    if (!summary) return [];
    return [
      ['Contratos vigentes', summary.total_contracts > 0 ? Math.round((summary.active_contracts / summary.total_contracts) * 100) : null],
      ['Contratos con respaldo', summary.total_contracts > 0 ? Math.round(((summary.total_contracts - summary.contracts_missing_file) / summary.total_contracts) * 100) : null],
      ['Documentos aprobados', summary.legal_documents > 0 ? Math.round((summary.approved_documents / summary.legal_documents) * 100) : null],
      ['Documentos sin vencimiento inmediato', summary.legal_documents > 0 ? Math.round(((summary.legal_documents - summary.expiring_documents) / summary.legal_documents) * 100) : null],
    ];
  }, [summary]);

  const trackerContracts = useMemo(
    () => contracts.slice(0, 8).map((contract) => ({
      id: contract.id,
      title: contract.title,
      provider: contract.contractor_name || 'Sin contratista',
      startDate: contract.start_date || null,
      endDate: contract.end_date || null,
      status: mapContractStatus(contract.status),
      value: formatContractValue(contract.contract_value, contract.currency),
      approvalStatus: mapApprovalStatus(contract.compliance_status),
      fileUrl: contract.file_url,
    })),
    [contracts],
  );

  const handleOpenDoc = async (doc: LegalDocument, download = false) => {
    if (!download) {
      setReviewError(null);
      setReviewingDoc(doc);
      setReviewModalOpen(true);
      return;
    }
    if (loadingDocId === doc.id) return;
    setLoadingDocId(doc.id);
    try {
      let url = doc.fileUrl;
      if (!url) {
        const response = await fetch(`/api/legal/documentos/download?id=${doc.id}`, { credentials: 'include' });
        const payload = await response.json();
        url = payload.url ?? null;
      }
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.title || 'documento';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleDocumentReview = async (docId: string, level: 'L1' | 'L2', status: 'cumple' | 'no_cumple' | null, observations: string) => {
    try {
      const response = await fetch('/api/legal/documentos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ docId, level, status, observations }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Error en la revisión');
      }
      await Promise.all([mutateDocuments(), mutateCompliance()]);
      setReviewError(null);
      setReviewingDoc(null);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Error desconocido al revisar el documento');
    }
  };

  const submitPayload = async (url: string, payload: FormPayload) => {
    const hasFile = payload.file instanceof File;
    const body = hasFile
      ? (() => {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) formData.append(key, value instanceof File ? value : String(value));
          });
          return formData;
        })()
      : JSON.stringify(payload);

    return fetch(url, {
      method: 'POST',
      headers: hasFile ? undefined : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
    });
  };

  const handleAddDocument = async (payload: FormPayload) => {
    const response = await submitPayload('/api/legal/documentos', payload);
    if (response.ok) await Promise.all([mutateDocuments(), mutateCompliance()]);
  };

  const handleAddContract = async (payload: FormPayload) => {
    const response = await submitPayload('/api/legal/contratos', payload);
    if (response.ok) await Promise.all([mutateContracts(), mutateCompliance()]);
  };

  const hasError = documentsError || contractsError || complianceError;
  const metrics: Array<[string, string | number]> = [
    ['Contratos vigentes', summary ? summary.active_contracts : '—'],
    ['Por vencer', summary ? summary.expiring_contracts : '—'],
    ['Pendientes de revisión', summary ? summary.contracts_pending_review : '—'],
    ['Cumplimiento', compliancePercent === null ? '—' : `${compliancePercent}%`],
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal y contratos</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Gestión legal</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Contratos, documentos, revisiones y vencimientos en un solo flujo.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/legal/permisos-licencias">Permisos y licencias</Link>
        </Button>
      </header>

      {reviewError ? <StatePanel tone="error" title="No fue posible completar la revisión" description={reviewError} className="min-h-0" /> : null}
      {hasError ? (
        <StatePanel
          tone="error"
          title="Parte del módulo legal no pudo actualizarse"
          description="Las cifras o listas cuya fuente falló permanecen sin dato; no se sustituyen por cero ni por fechas generadas."
          actions={<Button variant="outline" size="sm" onClick={() => { void mutateDocuments(); void mutateContracts(); void mutateCompliance(); }}>Reintentar</Button>}
          className="min-h-0"
        />
      ) : null}

      <section aria-label="Resumen legal" className="grid overflow-hidden rounded-md border sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-t-0 sm:border-l' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-fit gap-1 bg-transparent p-0">
          <TabsTrigger value="documents" className="gap-2 px-3"><FileText className="h-4 w-4" />Documentos</TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2 px-3"><Scale className="h-4 w-4" />Contratos</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2 px-3"><CheckCircle2 className="h-4 w-4" />Cumplimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Documentos legales</h2>
              <p className="text-sm text-muted-foreground">Respaldo regulatorio, políticas y procedimientos.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar documentos" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
              </div>
              <AddDocumentModal onSubmit={handleAddDocument} />
            </div>
          </div>

          <div className="divide-y overflow-hidden rounded-md border">
            {documentsError ? (
              <StatePanel tone="error" title="Documentos no disponibles" description="No se interpreta el fallo de la fuente como biblioteca vacía." className="border-0" />
            ) : legalDocs.length === 0 ? (
              <StatePanel tone="neutral" title="No hay documentos legales" description="Agrega el primer documento cuando exista respaldo real que registrar." className="border-0" />
            ) : legalDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{(doc.documentType || 'Documento').replace(/_/g, ' ')} · {doc.description || 'Sin descripción'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {getStatusBadge(doc.status)}
                  {(doc.fileUrl || doc.filePath) ? <>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleOpenDoc(doc, false)} aria-label={`Revisar ${doc.title}`}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon-sm" disabled={loadingDocId === doc.id} onClick={() => handleOpenDoc(doc, true)} aria-label={`Descargar ${doc.title}`}><Download className="h-4 w-4" /></Button>
                  </> : null}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Contratos</h2>
              <p className="text-sm text-muted-foreground">Vigencia, contratista, monto y cumplimiento.</p>
            </div>
            <AddContractModal onSubmit={handleAddContract} />
          </div>
          {contractsError ? <StatePanel tone="error" title="Contratos no disponibles" description="La fuente no se reemplaza por una matriz vacía." className="min-h-0" /> : <ContractsTracker contracts={trackerContracts} />}
        </TabsContent>

        <TabsContent value="compliance" className="mt-4 space-y-5">
          <div>
            <h2 className="text-base font-semibold">Cumplimiento</h2>
            <p className="text-sm text-muted-foreground">Respaldo contractual, aprobaciones y vencimientos.</p>
          </div>

          {complianceError ? <StatePanel tone="error" title="Cumplimiento no disponible" description="No se calcula 0% ni 100% cuando la fuente no responde." className="min-h-0" /> : null}

          <div className="divide-y rounded-md border">
            {complianceItems.length ? complianceItems.map(([requirement, percentage]) => (
              <div key={requirement} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm font-medium">{requirement}</span>
                <span className="text-sm font-semibold tabular-nums">{percentage === null ? '—' : `${percentage}%`}</span>
              </div>
            )) : <p className="px-4 py-3 text-sm text-muted-foreground">Sin base suficiente para calcular porcentajes de cumplimiento.</p>}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold">Contratos por revisar</p>
              <div className="divide-y rounded-md border">
                {(compliance.contracts_pending_review || []).slice(0, 5).map((item) => <p key={item.id} className="px-4 py-3 text-sm">{item.title}</p>)}
                {(compliance.contracts_pending_review || []).length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">{complianceError ? 'Fuente no disponible.' : 'Sin contratos pendientes.'}</p> : null}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Documentos por vencer</p>
              <div className="divide-y rounded-md border">
                {(compliance.expiring_documents || []).slice(0, 5).map((item) => <p key={item.id} className="px-4 py-3 text-sm">{item.title}{item.expiry_date ? ` · ${new Date(item.expiry_date).toLocaleDateString('es-CL')}` : ''}</p>)}
                {(compliance.expiring_documents || []).length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">{complianceError ? 'Fuente no disponible.' : 'Sin vencimientos próximos.'}</p> : null}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DocumentReviewModal
        open={reviewModalOpen}
        document={reviewingDoc}
        level="L1"
        onClose={() => { setReviewModalOpen(false); setReviewingDoc(null); }}
        onReview={handleDocumentReview}
      />
    </div>
  );
}
