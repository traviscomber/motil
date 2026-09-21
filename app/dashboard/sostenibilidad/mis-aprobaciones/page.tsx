'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return payload;
};

type SessionData = {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
  };
  role?: string | null;
};

type DocumentFlowResponse<T = unknown> = {
  data?: T[];
};

function daysSince(dateValue?: string | null) {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

type DocumentApproval = {
  approval_level?: number | null;
  approval_level_name?: string | null;
  required_role?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_at?: string | null;
};

type DocumentRecord = {
  id: string;
  title?: string;
  documento_nombre?: string;
  description?: string;
  status?: string;
  document_approvals?: unknown;
  created_at?: string | null;
  [key: string]: unknown;
};

type PendingApprovalItem = {
  documentId: string;
  title: string;
  description: string;
  approvalLevelName: string;
  approvalLevel: number;
  assignedToName: string;
  status: string;
  createdAt: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toDocumentRecord = (value: unknown): DocumentRecord | null => {
  if (!isRecord(value) || !value.id) return null;

  return {
    id: String(value.id),
    title: typeof value.title === 'string' ? value.title : undefined,
    documento_nombre: typeof value.documento_nombre === 'string' ? value.documento_nombre : undefined,
    description: typeof value.description === 'string' ? value.description : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
    document_approvals: value.document_approvals,
    created_at: typeof value.created_at === 'string' ? value.created_at : null,
    ...value,
  };
};

function getPendingApproval(doc: DocumentRecord, role: string | null | undefined, userId?: string) {
  const approvals: DocumentApproval[] = Array.isArray(doc.document_approvals) ? doc.document_approvals : [];
  return approvals.find((approval) => {
    const approvalRole = normalize(approval.required_role);
    const approvalStatus = normalize(approval.status);
    const assignedTo = String(approval.assigned_to || '');
    const roleMatches = role ? approvalRole === normalize(role) : false;
    const userMatches = userId ? assignedTo === userId : false;
    return approvalStatus === 'pending' && (roleMatches || userMatches);
  });
}

export default function MisAprobacionesPage() {
  const { data: session } = useSWR<SessionData>('/api/auth/session', fetcher);
  const currentRole = session?.role || null;
  const currentUserId = session?.user?.id;

  const { data, isLoading } = useSWR<DocumentFlowResponse<unknown> | null>('/api/sostenibilidad/documentos-flujo', fetcher);

  const documentos = Array.isArray(data?.data)
    ? data.data.map(toDocumentRecord).filter((doc): doc is DocumentRecord => doc !== null)
    : [];

  const pendingApprovals: PendingApprovalItem[] = documentos
    .map((doc) => {
      const pendingApproval = getPendingApproval(doc, currentRole, currentUserId);
      return pendingApproval
        ? {
          documentId: doc.id,
            title: doc.title || doc.documento_nombre || 'Documento',
            description: doc.description || '',
            approvalLevelName: pendingApproval.approval_level_name || `Nivel ${pendingApproval.approval_level || 1}`,
            approvalLevel: pendingApproval.approval_level || 1,
            assignedToName: pendingApproval.assigned_to_name || '',
            status: pendingApproval.status || 'pending',
            createdAt: doc.created_at || pendingApproval.created_at || null,
          }
        : null;
    })
    .filter((item): item is PendingApprovalItem => item !== null);

  const approvedCount = documentos.filter((doc) => normalize(doc.status) === 'approved').length;
  const rejectedCount = documentos.filter((doc) => normalize(doc.status) === 'rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Mis aprobaciones</h1>
        <p className="text-muted-foreground">
          {currentRole
            ? `Pendientes asignadas a tu rol ${currentRole}`
            : 'Pendientes de revisión en el flujo de sostenibilidad'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingApprovals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos pendientes</CardTitle>
          <CardDescription>Esperando tu revisión y aprobación</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Cargando...</p>
          ) : pendingApprovals.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Sin documentos pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={`${approval.documentId}-${approval.approvalLevel}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <h3 className="font-semibold">{approval.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{approval.description || 'Sin descripción'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{approval.approvalLevelName}</Badge>
                      <Badge variant="secondary">{approval.status}</Badge>
                      <Badge variant="outline">{daysSince(approval.createdAt)} d</Badge>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/sostenibilidad/documentos-flujo?doc=${approval.documentId}`}>
                      Revisar
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
