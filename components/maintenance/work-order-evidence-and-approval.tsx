'use client';

import useSWR from 'swr';
import { CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'request failed');
  return payload;
};

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function WorkOrderEvidenceAndApproval({ workOrderId, status }: { workOrderId: string; status?: string | null }) {
  const evidence = useSWR(`/api/maintenance/work-orders/${workOrderId}/evidence`, fetcher);
  const review = useSWR(status === 'completed' ? `/api/maintenance/work-orders/${workOrderId}/review` : null, fetcher);

  const photos = evidence.data?.evidence || [];
  const currentReview = review.data?.review;
  const canApprove = Boolean(review.data?.canApprove);

  const approve = async () => {
    const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/review`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'No se pudo aprobar la OT.');
    await review.mutate();
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evidencia fotográfica</CardTitle>
          <p className="text-sm text-muted-foreground">{photos.length ? `${photos.length} archivo${photos.length === 1 ? '' : 's'} registrado${photos.length === 1 ? '' : 's'}` : 'Sin evidencia registrada.'}</p>
        </CardHeader>
        <CardContent>
          {photos.length ? (
            <div className="divide-y rounded-lg border">
              {photos.map((photo: { id: string; file_name?: string | null; created_at?: string | null; signed_url?: string | null }) => (
                <a key={photo.id} href={photo.signed_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-muted/30">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {photo.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.signed_url} alt={photo.file_name || 'Evidencia de OT'} className="h-full w-full object-cover" />
                    ) : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{photo.file_name || 'Foto de evidencia'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(photo.created_at)}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {status === 'completed' ? (
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aprobación</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {currentReview?.status === 'approved' ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4" />Aprobada</p>
                  <p className="mt-1 text-xs text-muted-foreground">{currentReview.reviewed_by_name || 'Supervisor'} · {formatDate(currentReview.reviewed_at)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Pendiente de aprobación</p>
                  <p className="mt-1 text-xs text-muted-foreground">Ariel López o Mauricio Astudillo revisan la evidencia y aprueban la OT.</p>
                </>
              )}
            </div>
            {canApprove ? <Button onClick={() => void approve()}><CheckCircle2 className="mr-2 h-4 w-4" />Aprobar OT</Button> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
