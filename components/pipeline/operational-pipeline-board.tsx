'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type PipelineItem = {
  pipeline_id: string;
  request_number?: string | null;
  work_order_number?: string | null;
  work_order_title?: string | null;
  asset_code?: string | null;
  asset_name?: string | null;
  priority?: string | null;
  current_stage: string;
  next_action: string;
  next_action_href: string;
  blockers?: string[] | null;
  progress_percent: number;
  order_number?: string | null;
  supplier_name?: string | null;
  required_supplier_quotes?: number | null;
  distinct_supplier_count?: number | null;
  missing_supplier_quotes?: number | null;
  uses_exception_policy?: boolean | null;
  quotation_exception_type?: string | null;
  quotation_exception_reason?: string | null;
};

type Response = { data?: PipelineItem[] };

const quotationExceptionLabels: Record<string, string> = {
  emergency: 'Emergencia',
  single_source: 'Proveedor único',
  framework_contract: 'Contrato vigente',
  technical_single_source: 'Proveedor técnico único',
  other: 'Otra excepción',
};

const stageLabels: Record<string, string> = {
  assignment: 'Asignación',
  request: 'Solicitud',
  requested: 'Solicitud',
  quotation: 'Cotización',
  quotations: 'Cotizaciones',
  comparison: 'Comparación',
  approval: 'Aprobación',
  approved: 'Aprobada',
  purchase_order: 'Orden de compra',
  ordered: 'Orden emitida',
  reception: 'Recepción',
  receiving: 'Recepción',
  received: 'Recibida',
  delivery: 'Entrega',
  delivered: 'Entregada',
  completed: 'Completada',
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el seguimiento de compras.');
  return payload;
};

function stageLabel(value: string) {
  const normalized = String(value || '').toLowerCase();
  return stageLabels[normalized] || value || 'Pendiente';
}

export function OperationalPipelineBoard({ compact = false }: { compact?: boolean }) {
  const { data, error, isLoading, mutate } = useSWR<Response>('/api/pipeline/operational?limit=20', fetcher, {
    revalidateOnFocus: false,
  });
  const items = data?.data || [];

  return (
    <Card>
      {!compact ? <CardHeader className="pb-3">
        <CardTitle className="text-base">Seguimiento de compras</CardTitle>
        <p className="text-sm text-muted-foreground">Cada caso muestra su estado actual, bloqueos verificados y la siguiente acción disponible.</p>
      </CardHeader> : null}
      <CardContent className={compact ? 'pt-2' : undefined}>
        {isLoading ? <StatePanel tone="loading" title="Cargando seguimiento" className="border-0 bg-transparent" /> : null}
        {error ? <StatePanel tone="error" title="No fue posible cargar el seguimiento" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="border-0 bg-transparent" /> : null}
        {!isLoading && !error && items.length === 0 ? <StatePanel tone="neutral" title="No hay compras abiertas" description={compact ? undefined : 'Los casos pendientes aparecerán aquí cuando exista una solicitud, cotización, orden o recepción en curso.'} className="border-0 bg-transparent" /> : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="divide-y">
            {items.map((item) => {
              const blockers = item.blockers || [];
              const requiredSupplierQuotes = Math.max(1, item.required_supplier_quotes || 1);
              const distinctSupplierCount = Math.max(0, item.distinct_supplier_count || 0);
              const exceptionLabel = quotationExceptionLabels[item.quotation_exception_type || ''] || 'Excepción aprobada';
              const reference = item.request_number || item.work_order_number || item.order_number || 'Caso de compra';

              if (compact) return (
                <div key={item.pipeline_id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium break-words">{item.work_order_title || item.asset_name || item.supplier_name || reference}</p>
                      <Badge variant="outline">{stageLabel(item.current_stage)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.next_action || 'Continuar revisión'}</p>
                    {blockers.length ? <p className="text-sm text-destructive">{blockers[0]}</p> : null}
                    <details className="text-xs text-muted-foreground">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium">Detalles</summary>
                      <div className="space-y-1 pb-2">
                        <p>{reference}</p>
                        <p>{[item.asset_code, item.asset_name, item.supplier_name].filter(Boolean).join(' · ')}</p>
                        {blockers.slice(1).map((blocker, index) => <p key={index} className="text-destructive">{blocker}</p>)}
                        {item.uses_exception_policy ? <p>Excepción aprobada: {exceptionLabel} · {distinctSupplierCount} de {requiredSupplierQuotes} proveedores</p> : null}
                        {item.quotation_exception_reason ? <p>{item.quotation_exception_reason}</p> : null}
                      </div>
                    </details>
                  </div>
                  <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                    <Link href={item.next_action_href || '/dashboard/compras'}>Abrir<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              );

              return (
                <div key={item.pipeline_id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_260px_220px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{reference}</p>
                      <Badge variant="outline">{stageLabel(item.current_stage)}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {[item.work_order_title, item.asset_code, item.asset_name, item.supplier_name].filter(Boolean).join(' · ') || 'Sin información adicional'}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-foreground" style={{ width: `${Math.max(0, Math.min(100, item.progress_percent || 0))}%` }} />
                    </div>
                    {blockers.length ? (
                      <p className="mt-2 text-xs text-destructive">Bloqueo: {blockers[0]}{blockers.length > 1 ? ` · ${blockers.length - 1} adicionales` : ''}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Sin bloqueos registrados.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Siguiente acción</p>
                    {item.uses_exception_policy ? (
                      <div className="mt-1 space-y-1" title={item.quotation_exception_reason || undefined}>
                        <p className="text-xs text-muted-foreground">Excepción aprobada: {exceptionLabel}</p>
                        <p className="text-sm font-medium">{distinctSupplierCount} de {requiredSupplierQuotes} proveedores · {item.next_action}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm font-medium">{item.next_action || 'Continuar revisión'}</p>
                    )}
                  </div>

                  <Button asChild className="w-full justify-between">
                    <Link href={item.next_action_href || '/dashboard/compras'}>
                      Abrir
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
