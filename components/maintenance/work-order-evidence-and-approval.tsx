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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Evidencia fotográfica</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{photos.length ? `${photos.length} archivo${photos.length === 1 ? '' : 's'} registrado${photos.length === 1 ? '' : 's'}` : 'Sin evidencia registrada.'}</p>
            </div>
            {status === 'completed' && canApprove && photos.length > 0 && currentReview?.status !== 'approved' ? (
              <Button onClick={() => void approve()}><CheckCircle2 className="mr-2 h-4 w-4" />Aprobar OT</Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {photos.length ? (
            <div className="space-y-3">
              <a href={photos[0]?.signed_url || '#'} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border bg-muted">
                {photos[0]?.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[0].signed_url} alt={photos[0].file_name || 'Evidencia principal de OT'} className="max-h-[560px] w-full object-contain" />
                ) : <div className="flex min-h-64 items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
              </a>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{formatDate(photos[0]?.created_at)}</span>
                <span>Abrir imagen completa</span>
              </div>
              {photos.length > 1 ? (
                <details className="rounded-lg border">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ver {photos.length - 1} evidencia{photos.length - 1 === 1 ? '' : 's'} adicional{photos.length - 1 === 1 ? '' : 'es'}</summary>
                  <div className="grid gap-3 border-t p-3 sm:grid-cols-2">
                    {photos.slice(1).map((photo: { id: string; file_name?: string | null; created_at?: string | null; signed_url?: string | null }) => (
                      <a key={photo.id} href={photo.signed_url || '#'} target="_blank" rel="noreferrer" className="overflow-hidden rounded-md border bg-muted">
                        {photo.signed_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.signed_url} alt={photo.file_name || 'Evidencia de OT'} className="h-44 w-full object-cover" />
                        ) : <div className="flex h-44 items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>}
                        <div className="px-3 py-2 text-xs text-muted-foreground">{formatDate(photo.created_at)}</div>
                      </a>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {status === 'completed' && currentReview?.status === 'approved' ? (
        <div className="rounded-lg border bg-muted/20 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4" />OT aprobada</p>
          <p className="mt-1 text-xs text-muted-foreground">{currentReview.reviewed_by_name || 'Supervisor'} · {formatDate(currentReview.reviewed_at)}</p>
        </div>
      ) : status === 'completed' && !canApprove ? (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium">Pendiente de aprobación</p>
          <p className="mt-1 text-xs text-muted-foreground">Ariel López o Mauricio Astudillo revisan la evidencia y aprueban la OT.</p>
        </div>
      ) : null}
    </div>
  );
}
