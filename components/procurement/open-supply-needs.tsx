'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useModuleAccess } from '@/hooks/use-module-access';
import useSWR, { useSWRConfig } from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, PackageCheck, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el pipeline');
  if (payload?.unavailable) throw new Error('El seguimiento de compras no está disponible.');
  return payload;
};

type PipelineRow = { intake_request_id: string; request_number: string; pipeline_status: string; priority?: string | null; required_date?: string | null; work_order_id?: string | null; work_order_number?: string | null; work_order_title?: string | null; asset_code?: string | null; asset_name?: string | null; quotation_id?: string | null; quotation_number?: string | null; quotation_status?: string | null; supplier_name?: string | null; quotation_total?: number | null; order_id?: string | null; order_number?: string | null; order_status?: string | null; quantity_ordered?: number | null; quantity_received?: number | null; required_supplier_quotes?: number; distinct_supplier_count?: number; award_policy_satisfied?: boolean };
type RequestLine = { id: string; intake_request_id: string; description?: string | null; product_code?: string | null; quantity: number; unit?: string | null; estimated_unit_cost?: number | null };
type OrderLine = { id: string; order_id: string; description?: string | null; product_code?: string | null; quantity_ordered: number; quantity_received: number; unit?: string | null; unit_cost: number };
type Supplier = { id: string; legal_name: string; trade_name?: string | null; tax_id?: string | null; payment_terms?: string | null };

const statusLabel: Record<string, string> = { awaiting_quote: 'Cotizar', awaiting_award: 'Adjudicar', awaiting_receipt: 'Recibir', ready_for_issue: 'Disponible para OT', received: 'Recibida', closed: 'Cerrada' };

export function OpenSupplyNeeds() {
  const { ready, canView } = useModuleAccess();
  const { mutate: refreshRelated } = useSWRConfig();
  const workOrderId = useSearchParams().get('workOrderId')?.trim();
  const endpoint = workOrderId ? `/api/procurement/operational-pipeline?workOrderId=${encodeURIComponent(workOrderId)}` : '/api/procurement/operational-pipeline';
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher);
  const rows: PipelineRow[] = data?.pipeline || [];
  const requestLines: RequestLine[] = data?.requestLines || [];
  const orderLines: OrderLine[] = data?.orderLines || [];
  const [selected, setSelected] = useState<PipelineRow | null>(null);
  const [mode, setMode] = useState<'quote' | 'receive' | null>(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const { data: supplierData } = useSWR(mode === 'quote' && supplierQuery.length >= 2 ? `/api/procurement/workflow?resource=suppliers&q=${encodeURIComponent(supplierQuery)}` : null, fetcher);
  const suppliers: Supplier[] = supplierData?.suppliers || [];
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [leadTime, setLeadTime] = useState('');
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receivedOrder, setReceivedOrder] = useState<PipelineRow | null>(null);
  const [awardCandidate, setAwardCandidate] = useState<PipelineRow | null>(null);

  const activeRows = useMemo(() => rows.filter((row) => !['closed', 'cancelled'].includes(row.pipeline_status)), [rows]);
  if (!receivedOrder && !workOrderId && !isLoading && !error && activeRows.length === 0) return null;

  const execute = async (body: unknown) => {
    setBusy(true); setActionError(null);
    try {
      const response = await fetch('/api/procurement/operational-pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo completar la operación');
      await mutate();
      return true;
    } catch (executionError) {
      setActionError(executionError instanceof Error ? executionError.message : 'No se pudo completar la operación');
      return false;
    } finally { setBusy(false); }
  };

  const openQuote = (row: PipelineRow) => {
    const nextCosts: Record<string, string> = {};
    requestLines.filter((line) => line.intake_request_id === row.intake_request_id).forEach((line) => { nextCosts[line.id] = String(line.estimated_unit_cost || ''); });
    setSelected(row); setCosts(nextCosts); setSupplier(null); setSupplierQuery(''); setLeadTime(''); setMode('quote');
  };

  const saveQuote = async () => {
    if (!selected || !supplier) return setActionError('Selecciona un proveedor.');
    const lines = requestLines.filter((line) => line.intake_request_id === selected.intake_request_id);
    if (lines.some((line) => Number(costs[line.id] || 0) <= 0)) return setActionError('Ingresa el costo unitario de todas las líneas.');
    const ok = await execute({ action: 'create_quotation', intakeRequestId: selected.intake_request_id, supplierId: supplier.id, leadTimeDays: leadTime ? Number(leadTime) : null, paymentTerms: supplier.payment_terms, lines: lines.map((line) => ({ intake_line_id: line.id, quantity: Number(line.quantity), unit_cost: Number(costs[line.id]) })) });
    if (ok) { setMode(null); setSelected(null); }
  };

  const award = async () => {
    if (!awardCandidate?.quotation_id) return;
    const ok = await execute({ action: 'award_quotation', quotationId: awardCandidate.quotation_id });
    if (ok) setAwardCandidate(null);
  };

  const openReceive = (row: PipelineRow) => {
    const next: Record<string, string> = {};
    orderLines.filter((line) => line.order_id === row.order_id).forEach((line) => { next[line.id] = String(Math.max(0, Number(line.quantity_ordered) - Number(line.quantity_received))); });
    setActionError(null); setSelected(row); setReceipts(next); setMode('receive');
  };

  const receive = async () => {
    if (!selected?.order_id) return;
    const lines = orderLines.filter((line) => line.order_id === selected.order_id).map((line) => ({ order_line_id: line.id, quantity_received: Number(receipts[line.id] || 0), quantity_accepted: Number(receipts[line.id] || 0), quantity_rejected: 0 })).filter((line) => line.quantity_received > 0);
    if (!lines.length) return setActionError('Ingresa una cantidad recibida.');
    const ok = await execute({ action: 'receive_order', orderId: selected.order_id, lines });
    if (ok) {
      setReceivedOrder(selected); setMode(null); setSelected(null);
      void refreshRelated((key) => typeof key === 'string' && (key.startsWith('/api/pipeline/operational?') || key.startsWith('/api/warehouse/stock') || (Boolean(selected.work_order_id) && key === `/api/maintenance/work-orders/${selected.work_order_id}/materials`)), undefined, { revalidate: true });
    }
  };

  return <>
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Necesidades desde mantenimiento</CardTitle><p className="mt-1 text-sm text-muted-foreground">Pipeline continuo desde el faltante de la OT hasta la recepción y entrega.</p></div><Badge variant={activeRows.length ? 'destructive' : 'secondary'}>{activeRows.length} activa(s)</Badge></CardHeader>
      <CardContent>
        {receivedOrder ? <div role="status" className="mb-3 rounded-lg border p-3 text-sm">Recepción registrada para {receivedOrder.order_number || 'la orden de compra'}. {receivedOrder.work_order_id && ready && canView('mant_operaciones') ? <Link className="underline underline-offset-4" href={`/dashboard/mantenimiento/ordenes-trabajo/${encodeURIComponent(receivedOrder.work_order_id)}`}>Revisar materiales y entrega en la OT</Link> : 'El stock de Bodega fue actualizado.'}</div> : null}
        {workOrderId && ready && canView('mant_operaciones') ? <Link href={`/dashboard/mantenimiento/ordenes-trabajo/${encodeURIComponent(workOrderId)}`} className="mb-3 inline-block text-sm underline underline-offset-4">Volver a la OT de origen</Link> : null}
        {workOrderId && !isLoading && !error && activeRows.length === 0 ? <p className="text-sm text-muted-foreground">No se encontraron necesidades abiertas para esta OT. <Link href="/dashboard/compras/flujo" className="underline underline-offset-4">Ver todas las compras</Link></p> : null}
        {isLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted" /> : null}
        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
        {actionError ? <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
        <div className="divide-y rounded-lg border">{(!error ? activeRows : []).map((row) => <div key={row.intake_request_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-center">
          <div className="min-w-0"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><p className="truncate font-medium">{row.request_number} · {row.work_order_number || 'OT'}</p></div><p className="mt-1 truncate text-xs text-muted-foreground">{row.work_order_title || 'Sin título'} · {row.asset_code || 'Sin activo'} {row.asset_name || ''}</p></div>
          <div><p className="text-xs text-muted-foreground">Estado</p><Badge variant="outline">{statusLabel[row.pipeline_status] || row.pipeline_status}</Badge></div>
          <div><p className="text-xs text-muted-foreground">Documento</p><p className="text-sm font-medium">{row.order_number || row.quotation_number || 'Pendiente'}</p>{row.supplier_name ? <p className="text-xs text-muted-foreground">{row.supplier_name}</p> : null}</div>
          <div className="flex flex-wrap justify-end gap-2">{row.pipeline_status === 'awaiting_quote' ? <Button size="sm" onClick={() => openQuote(row)}><ReceiptText className="mr-2 h-4 w-4" />Cotizar</Button> : null}{row.pipeline_status === 'awaiting_award' ? <Button size="sm" onClick={() => setAwardCandidate(row)} disabled={busy || row.award_policy_satisfied === false} title={row.award_policy_satisfied === false ? `Faltan ${Math.max(0, Number(row.required_supplier_quotes || 0) - Number(row.distinct_supplier_count || 0))} proveedores cotizados` : undefined}><CheckCircle2 className="mr-2 h-4 w-4" />Adjudicar</Button> : null}{row.pipeline_status === 'awaiting_receipt' ? <Button size="sm" onClick={() => openReceive(row)}><PackageCheck className="mr-2 h-4 w-4" />Recibir</Button> : null}{row.work_order_id && ready && canView('mant_operaciones') ? <Button asChild size="sm" variant="outline"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${encodeURIComponent(row.work_order_id)}`}>Ver OT <ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : null}</div>
        </div>)}</div>
      </CardContent>
    </Card>

    <AlertDialog open={Boolean(awardCandidate)} onOpenChange={(open) => { if (!open && !busy) setAwardCandidate(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Adjudicar y emitir la orden de compra?</AlertDialogTitle><AlertDialogDescription>Esta acción adjudicará {awardCandidate?.quotation_number || 'la cotización'} a {awardCandidate?.supplier_name || 'este proveedor'} y emitirá una OC operativa. No es sólo una vista previa.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void award(); }} disabled={busy}>{busy ? 'Emitiendo…' : 'Confirmar adjudicación y emitir OC'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>

    <Dialog open={mode === 'quote'} onOpenChange={(open) => { if (!open) setMode(null); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Registrar cotización</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Buscar proveedor</Label><Input value={supplierQuery} onChange={(event) => setSupplierQuery(event.target.value)} placeholder="Nombre o RUT" />{suppliers.length ? <div className="mt-2 max-h-36 divide-y overflow-auto rounded-lg border">{suppliers.map((item) => <button type="button" key={item.id} className="block w-full p-3 text-left hover:bg-muted" onClick={() => setSupplier(item)}><p className="font-medium">{item.legal_name}</p><p className="text-xs text-muted-foreground">{item.tax_id}</p></button>)}</div> : null}{supplier ? <p className="mt-2 text-sm font-medium">Seleccionado: {supplier.legal_name}</p> : null}</div><div><Label>Plazo de entrega (días)</Label><Input type="number" min="0" value={leadTime} onChange={(event) => setLeadTime(event.target.value)} /></div><div className="space-y-2">{requestLines.filter((line) => line.intake_request_id === selected?.intake_request_id).map((line) => <div key={line.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_160px] sm:items-end"><div><p className="font-medium">{line.description || line.product_code}</p><p className="text-xs text-muted-foreground">{line.quantity} {line.unit || 'un.'}</p></div><div><Label>Cantidad</Label><Input value={String(line.quantity)} disabled /></div><div><Label>Costo unitario</Label><Input type="number" min="0" value={costs[line.id] || ''} onChange={(event) => setCosts((current) => ({ ...current, [line.id]: event.target.value }))} /></div></div>)}</div></div><DialogFooter><Button variant="outline" onClick={() => setMode(null)}>Cancelar</Button><Button onClick={saveQuote} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cotización'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={mode === 'receive'} onOpenChange={(open) => { if (!open) setMode(null); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Registrar recepción</DialogTitle></DialogHeader>{actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}<div className="space-y-2">{orderLines.filter((line) => line.order_id === selected?.order_id).map((line) => <div key={line.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_150px] sm:items-end"><div><p className="font-medium">{line.description || line.product_code}</p><p className="text-xs text-muted-foreground">Ordenado {line.quantity_ordered} · recibido {line.quantity_received}</p></div><div><Label>Recibir ahora</Label><Input type="number" min="0" max={Math.max(0, Number(line.quantity_ordered) - Number(line.quantity_received))} value={receipts[line.id] || ''} onChange={(event) => setReceipts((current) => ({ ...current, [line.id]: event.target.value }))} /></div></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setMode(null)}>Cancelar</Button><Button onClick={receive} disabled={busy}>{busy ? 'Recibiendo…' : 'Confirmar recepción'}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
