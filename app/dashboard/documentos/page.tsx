'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatePanel } from '@/components/ui/state-panel';
import { DocumentUploadModal } from '@/components/documents/document-upload-modal';
import { DocumentViewer, type DocumentViewerDocument } from '@/components/documents/document-viewer';
import { DocumentList, type Document } from '@/components/documents/document-list';
import { ApprovalWorkflowCard, type ApprovalStep } from '@/components/documents/approval-workflow-card';
import { AdvancedDocumentSearch } from '@/components/documents/advanced-search';

interface PendingApproval {
  id: string;
  documentId: string;
  steps: ApprovalStep[];
  document: {
    id: string;
    title: string;
    documentNumber: string;
    documentType: string;
    category: string;
    createdAt: string;
    createdByUser: { name: string; email: string };
  };
}

type DocumentStats = { total: number; approved: number; pending: number; expired: number };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la fuente documental');
  return payload;
};

export default function DocumentosDashboard() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentViewerDocument | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const documentsParams = new URLSearchParams();
  if (activeTab === 'pending' || activeTab === 'approved') {
    documentsParams.set('status', activeTab);
  } else if (statusFilter) {
    documentsParams.set('status', statusFilter);
  }
  if (searchQuery.trim()) documentsParams.set('search', searchQuery.trim());

  const documentsEndpoint = documentsParams.toString()
    ? `/api/documents?${documentsParams.toString()}`
    : '/api/documents';

  const {
    data: documentsData,
    error: documentsError,
    isLoading: docsLoading,
    mutate: mutateDocuments,
  } = useSWR(documentsEndpoint, fetcher);
  const { data: approvalsData, error: approvalsError, mutate: mutateApprovals } = useSWR('/api/documents/pending', fetcher);
  const { data: statsData, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR('/api/documents/stats', fetcher);

  const documents = Array.isArray(documentsData?.documents) ? documentsData.documents : [];
  const pendingApprovals = Array.isArray(approvalsData?.approvals) ? approvalsData.approvals : [];
  const stats = statsData && typeof statsData === 'object' ? statsData as DocumentStats : null;
  const anySourceError = documentsError || approvalsError || statsError;

  const refreshAll = async () => {
    await Promise.all([mutateDocuments(), mutateApprovals(), mutateStats()]);
  };

  const handleViewDocument = (document: Document | string) => {
    const toViewerDocument = (doc: Document): DocumentViewerDocument => ({
      createdByUser: (() => {
        const createdByUser = doc.createdByUser as { name?: string; email?: string } | undefined;
        return {
          name: createdByUser?.name || doc.uploaded_by || 'Desconocido',
          email: createdByUser?.email || '',
        };
      })(),
      id: String(doc.id),
      title: doc.document_name || doc.title || 'Documento sin título',
      documentNumber: doc.document_code || doc.documentNumber || 'Sin código',
      documentType: doc.document_type_category || doc.documentType || 'Documento',
      category: doc.document_type_category || doc.category || 'General',
      status: doc.status || 'draft',
      fileUrl: String(doc.file_url || doc.fileUrl || ''),
      fileSize: Number(doc.file_size_bytes || doc.fileSize || 0),
      createdAt: doc.createdAt || doc.uploaded_at || null,
    });

    if (typeof document === 'string') {
      const doc = documents.find((item: Document) => String(item.id) === document);
      if (doc) setSelectedDocument(toViewerDocument(doc));
    } else {
      setSelectedDocument(toViewerDocument(document));
    }
    setViewerOpen(true);
  };

  const handleUploadSuccess = async () => {
    await refreshAll();
    toast.success('Documento agregado a la lista');
  };

  const handleApprove = async (documentId: string, approvalId: string, comments: string) => {
    const response = await fetch(`/api/documents/${documentId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ approvalId, comments }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'No se pudo aprobar el documento');
    }
    await refreshAll();
  };

  const handleReject = async (documentId: string, approvalId: string, reason: string) => {
    const response = await fetch(`/api/documents/${documentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ approvalId, reason }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'No se pudo rechazar el documento');
    }
    await refreshAll();
  };

  const statValue = (key: keyof DocumentStats) => statsLoading || !stats ? '—' : stats[key].toLocaleString('es-CL');
  const summaryCards = [
    { label: 'Documentos', value: statValue('total') },
    { label: 'Aprobados', value: statValue('approved') },
    { label: 'Pendientes', value: statValue('pending') },
    { label: 'Vencidos', value: statValue('expired') },
  ];
  const documentList = documentsError
    ? <StatePanel tone="error" title="Biblioteca no disponible" description="La falla de la fuente no se interpreta como una biblioteca vacía." />
    : <DocumentList documents={documents} isLoading={docsLoading} onView={handleViewDocument} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Documentación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Biblioteca</h1>
          <p className="mt-2 text-sm text-muted-foreground">Documentos, búsqueda y aprobaciones con trazabilidad de fuente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/documentos/importar"><ArrowRight className="mr-2 h-4 w-4" />Importar documentos</Link></Button>
          <Button onClick={() => setUploadModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Subir documento</Button>
        </div>
      </header>

      {anySourceError ? <StatePanel tone="error" title="Parte de Documentación no pudo actualizarse" description="Las listas o cifras afectadas permanecen sin dato; no se sustituyen por cero." actions={<Button variant="outline" onClick={() => void refreshAll()}>Reintentar</Button>} className="min-h-0" /> : null}



      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({stats ? stats.pending : '—'})</TabsTrigger>
          <TabsTrigger value="approved">Aprobados ({stats ? stats.approved : '—'})</TabsTrigger>
          <TabsTrigger value="search">Búsqueda avanzada</TabsTrigger>
          {pendingApprovals.length > 0 ? <TabsTrigger value="my-approvals">Mis aprobaciones <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{pendingApprovals.length}</span></TabsTrigger> : null}
        </TabsList>

        <TabsContent value="all" className="space-y-4">{documentList}</TabsContent>
        <TabsContent value="pending" className="space-y-4">{documentList}</TabsContent>
        <TabsContent value="approved" className="space-y-4">{documentList}</TabsContent>
        <TabsContent value="search" className="space-y-4"><AdvancedDocumentSearch /></TabsContent>

        {pendingApprovals.length > 0 ? <TabsContent value="my-approvals" className="space-y-6">
          <div className="grid gap-4">
            {pendingApprovals.map((approval: PendingApproval) => <Card key={approval.id}>
              <CardHeader><div className="flex items-start justify-between gap-4"><CardTitle>{approval.document.title}</CardTitle><Button size="sm" variant="outline" onClick={() => { setSelectedDocument({ id: approval.document.id, title: approval.document.title, documentNumber: approval.document.documentNumber, documentType: approval.document.documentType, category: approval.document.category, status: 'pending', createdAt: approval.document.createdAt || null, createdByUser: approval.document.createdByUser }); setViewerOpen(true); }}>Ver documento</Button></div></CardHeader>
              <CardContent><ApprovalWorkflowCard documentId={approval.document.id} steps={approval.steps} currentUserCanApprove={true} onApprove={(stepId, comments) => handleApprove(approval.document.id, stepId, comments)} onReject={(stepId, reason) => handleReject(approval.document.id, stepId, reason)} /></CardContent>
            </Card>)}
          </div>
        </TabsContent> : null}
      </Tabs>

      {approvalsError ? <StatePanel tone="warning" title="Aprobaciones no disponibles" description="No se muestra una bandeja vacía mientras falla la fuente personal de aprobaciones." className="min-h-0" /> : null}

      <DocumentUploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} organizationId="" onSuccess={handleUploadSuccess} />

      {selectedDocument ? <DocumentViewer open={viewerOpen} onOpenChange={setViewerOpen} document={selectedDocument} /> : null}
      <details data-testid="documents-more-metrics" className="rounded-lg border bg-card"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ver más · Indicadores documentales</summary><div className="border-t p-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
        {summaryCards.map(({ label, value }) => <div key={label} className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
      </div>
      </div></details>

    </div>
  );
}
