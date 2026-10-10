'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, ClipboardList, PackageCheck, Plus, ReceiptText, Search, Sparkles, WalletCards, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SecondaryDetails } from '@/components/ui/secondary-details';
import { ProductPhoto } from '@/components/inventory/product-photo';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la información');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateLabel = (value?: string | null) => value ? value.split('-').reverse().join('-') : '';

const procurementStatusLabels: Record<string, string> = { draft: 'Borrador', submitted: 'Enviada', requested: 'Solicitada', quoted: 'Cotizada', received: 'Recibida', selected: 'Adjudicada', awarded: 'Adjudicada', issued: 'Emitida', partially_received: 'Recepción parcial', closed: 'Cerrada', cancelled: 'Cancelada', rejected: 'Rechazada' };
const priorityLabels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
const procurementStatusLabel = (status?: string | null) => procurementStatusLabels[status || ''] || 'Revisar estado';

type Product = { id: string; product_code: string; name: string; unit?: string | null; standard_cost?: number | null; media?: { image_url?: string | null; status?: string | null } | null };
type Supplier = { id: string; tax_id: string; legal_name: string; trade_name?: string | null; payment_terms?: string | null };
type SupplierRecommendation = Supplier & { supplier_name?: string | null; order_count?: number; covered_products?: number; coverage_ratio?: number; last_order_date?: string | null; last_order_number?: string | null; last_unit_cost?: number | null; currency?: string | null; order_date?: string | null; order_number?: string | null; unit_cost?: number | null; product_code?: string | null };
type RequestLine = { id: string; request_id: string; canonical_product_id?: string | null; product_code?: string | null; description?: string | null; quantity: number; unit?: string | null; estimated_unit_cost?: number | null; historical_unit_cost?: number | null; historical_currency?: string | null; historical_price_date?: string | null; historical_supplier_name?: string | null; historical_order_number?: string | null };
type RequestRow = { id: string; request_number: string; status: string; priority: string; required_date?: string | null; justification?: string | null; created_at: string };
type QuoteRow = { id: string; request_id: string; quotation_number: string; supplier_id: string; total_amount: number; currency: string; lead_time_days?: number | null; status: string };
type PurchaseOrderLine = { id: number; purchase_order_id: string; product_code?: string | null; description?: string | null; quantity: number; quantity_received: number; unit?: string | null; unit_cost?: number | null };
type PurchaseOrder = { id: string; order_number: string; supplier_name?: string | null; total_amount?: number | null; operational_status?: string | null; status?: string | null; expected_delivery_date?: string | null; procurement_request_id?: string | null };
type MetricCard = { label: string; value: number; icon: LucideIcon };

type NextAction =
  | { kind: 'new_request'; title: string; detail: string }
  | { kind: 'quote'; title: string; detail: string; request: RequestRow }
  | { kind: 'award'; title: string; detail: string; quote: QuoteRow }
  | { kind: 'receive'; title: string; detail: string; order: PurchaseOrder }
  | { kind: 'invoice'; title: string; detail: string }
  | { kind: 'wait'; title: string; detail: string };

export function ProgressiveProcurementWorkflow() {
  const { data, error, isLoading, mutate } = useSWR('/api/procurement/workflow', fetcher);
  const [requestOpen, setRequestOpen] = useState(false);
  const [quoteRequest, setQuoteRequest] = useState<RequestRow | null>(null);
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const { data: productData } = useSWR(requestOpen && productQuery.length >= 2 ? `/api/procurement/workflow?resource=products&q=${encodeURIComponent(productQuery)}` : null, fetcher);
  const { data: supplierData } = useSWR(quoteRequest && supplierQuery.length >= 2 ? `/api/procurement/workflow?resource=suppliers&q=${encodeURIComponent(supplierQuery)}` : null, fetcher);
  const { data: supplierRecommendationData, isLoading: supplierRecommendationsLoading } = useSWR(quoteRequest ? `/api/procurement/workflow?resource=supplier_recommendations&requestId=${encodeURIComponent(quoteRequest.id)}` : null, fetcher);

  const [priority, setPriority] = useState('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [justification, setJustification] = useState('');
  const [draftLines, setDraftLines] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});

  const requests: RequestRow[] = data?.requests || [];
  const requestLines: RequestLine[] = data?.requestLines || [];
  const quotations: QuoteRow[] = data?.quotations || [];
  const orders: PurchaseOrder[] = data?.purchaseOrders || [];
  const orderLines: PurchaseOrderLine[] = data?.purchaseOrderLines || [];
  const recommendedSuppliers: SupplierRecommendation[] = supplierRecommendationData?.recommendations || [];
  const recentSuppliers: SupplierRecommendation[] = supplierRecommendationData?.recent || [];

  const counts = useMemo(() => ({
    requests: requests.filter((row) => ['draft', 'submitted', 'quoted'].includes(row.status)).length,
    quoted: quotations.filter((row) => row.status === 'received').length,
    ordered: orders.filter((row) => !['received', 'closed'].includes(row.operational_status || row.status || '')).length,
    received: orders.filter((row) => (row.operational_status || row.status) === 'received').length,
  }), [orders, quotations, requests]);

  const metrics: MetricCard[] = [
    { label: 'Solicitudes activas', value: counts.requests, icon: ClipboardList },
    { label: 'Cotizaciones listas', value: counts.quoted, icon: ReceiptText },
    { label: 'OC por recibir', value: counts.ordered, icon: ArrowRight },
    { label: 'OC recibidas', value: counts.received, icon: PackageCheck },
  ];

  const nextAction = useMemo<NextAction>(() => {
    const awardable = quotations.find((quote) => quote.status === 'received');
    if (awardable) return { kind: 'award', title: 'Revisar adjudicación', detail: `${awardable.quotation_number} tiene cotización para revisar.`, quote: awardable };

    const receivable = orders.find((order) => {
      const lines = orderLines.filter((line) => line.purchase_order_id === order.id);
      return lines.some((line) => Number(line.quantity || 0) > Number(line.quantity_received || 0));
    });
    if (receivable) return { kind: 'receive', title: 'Registrar recepción', detail: `${receivable.order_number} tiene unidades pendientes de recepción.`, order: receivable };

    const quoteable = requests.find((request) => {
      if (!['draft', 'submitted', 'quoted'].includes(request.status)) return false;
      const quotes = quotations.filter((quote) => quote.request_id === request.id);
      return !quotes.some((quote) => quote.status === 'requested');
    });
    if (quoteable) return { kind: 'quote', title: 'Solicitar cotización', detail: `${quoteable.request_number} está lista para seleccionar proveedor.`, request: quoteable };

    const waitingQuote = requests.find((request) => quotations.some((quote) => quote.request_id === request.id && quote.status === 'requested'));
    if (waitingQuote) return { kind: 'wait', title: 'Esperando cotización', detail: `${waitingQuote.request_number} espera respuesta del proveedor.` };

    if (orders.some((order) => ['received', 'closed'].includes(order.operational_status || order.status || ''))) {
      return { kind: 'invoice', title: 'Continuar a factura', detail: 'Recepción registrada.' };
    }

    return { kind: 'new_request', title: 'Crear solicitud', detail: 'No hay compras pendientes.' };
  }, [orderLines, orders, quotations, requests]);

  const execute = async (body: unknown) => {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch('/api/procurement/workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo completar la operación');
      await mutate();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo completar la operación');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createRequest = async () => {
    if (!draftLines.length) return setActionError('Agrega al menos un producto.');
    const ok = await execute({ action: 'create_request', payload: { priority, required_date: requiredDate || null, justification, lines: draftLines.map(({ product, quantity }) => ({ canonical_product_id: product.id, quantity, unit: product.unit, estimated_unit_cost: product.standard_cost })) } });
    if (ok) { setRequestOpen(false); setDraftLines([]); setProductQuery(''); setJustification(''); setRequiredDate(''); setPriority('medium'); }
  };

  const createQuotation = async () => {
    if (!quoteRequest || !selectedSupplier) return setActionError('Selecciona un proveedor.');
    const lines = requestLines.filter((line) => line.request_id === quoteRequest.id);
    const ok = await execute({ action: 'create_quotation', payload: { request_id: quoteRequest.id, supplier_id: selectedSupplier.id, lead_time_days: leadTimeDays || null, payment_terms: selectedSupplier.payment_terms, lines: lines.map((line) => ({ request_line_id: line.id, quantity: Number(line.quantity) })) } });
    if (ok) { setQuoteRequest(null); setSelectedSupplier(null); setSupplierQuery(''); setLeadTimeDays(''); }
  };

  const openAwardDecision = () => {
    document.getElementById('procurement-award-decision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const receive = async () => {
    if (!receiveOrder) return;
    const lines = orderLines.filter((line) => line.purchase_order_id === receiveOrder.id).map((line) => ({ purchase_order_line_id: line.id, quantity_received: Number(receiptQuantities[line.id] || 0), quantity_accepted: Number(receiptQuantities[line.id] || 0), quantity_rejected: 0 })).filter((line) => line.quantity_received > 0);
    if (!lines.length) return setActionError('Ingresa al menos una cantidad recibida.');
    const ok = await execute({ action: 'receive_purchase_order', purchaseOrderId: receiveOrder.id, lines });
    if (ok) { setReceiveOrder(null); setReceiptQuantities({}); }
  };

  const chooseSupplier = (supplier: Supplier) => { setSelectedSupplier(supplier); setSupplierQuery(''); };
  const openQuote = (request: RequestRow) => { setQuoteRequest(request); setSelectedSupplier(null); setSupplierQuery(''); };
  const openReceive = (order: PurchaseOrder) => {
    setReceiveOrder(order);
    const quantities: Record<number, string> = {};
    orderLines.filter((line) => line.purchase_order_id === order.id).forEach((line) => { quantities[line.id] = String(Math.max(0, Number(line.quantity || 0) - Number(line.quantity_received || 0))); });
    setReceiptQuantities(quantities);
  };

  const nextActionControl = () => {
    if (nextAction.kind === 'award') return <Button onClick={openAwardDecision}><CheckCircle2 className="mr-2 h-4 w-4" />Revisar decisión</Button>;
    if (nextAction.kind === 'receive') return <Button onClick={() => openReceive(nextAction.order)}><PackageCheck className="mr-2 h-4 w-4" />Registrar recepción</Button>;
    if (nextAction.kind === 'quote') return <Button onClick={() => openQuote(nextAction.request)}><ReceiptText className="mr-2 h-4 w-4" />Solicitar cotización</Button>;
    if (nextAction.kind === 'invoice') return <Button asChild><Link href="/dashboard/compras/facturas"><ReceiptText className="mr-2 h-4 w-4" />Ir a Facturas</Link></Button>;
    if (nextAction.kind === 'new_request') return <Button onClick={() => setRequestOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva solicitud</Button>;
    return <Badge variant="secondary">Sin acción manual pendiente</Badge>;
  };

  if (isLoading) return <p role="status" className="p-5 text-sm text-muted-foreground">Cargando compras…</p>;
  if (error) return <div role="alert" className="p-5 text-sm text-destructive">{error.message}</div>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Comprar</h1>
        </div>
      </section>

      {actionError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Siguiente acción</p><h2 className="mt-1 text-xl font-semibold">{nextAction.title}</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{nextAction.detail}</p></div>
          <div className="shrink-0">{nextActionControl()}</div>
        </CardContent>
      </Card>

      <SecondaryDetails><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => <Card key={label} className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>)}
      </div></SecondaryDetails>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader><CardTitle>Solicitudes y cotizaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <p className="text-sm text-muted-foreground">Cargando flujo...</p> : null}
            {!isLoading && !requests.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay solicitudes operativas.</p> : null}
            {requests.map((request) => {
              const lines = requestLines.filter((line) => line.request_id === request.id);
              const quotes = quotations.filter((quote) => quote.request_id === request.id);
              const awardable = quotes.find((quote) => quote.status === 'received');
              const waiting = quotes.some((quote) => quote.status === 'requested');
              return <div key={request.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><div className="flex items-center gap-2"><p className="font-medium">{request.request_number}</p><Badge variant="outline">{procurementStatusLabel(request.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{lines.length} producto(s) · prioridad {priorityLabels[request.priority] || 'Sin definir'}</p><p className="mt-2 text-sm">{request.justification || 'Sin justificación adicional'}</p></div>
                  {awardable ? <Button size="sm" onClick={openAwardDecision}>Revisar adjudicación</Button> : waiting ? <Badge variant="secondary">Esperando respuesta</Badge> : ['draft', 'submitted', 'quoted'].includes(request.status) ? <Button size="sm" variant="outline" onClick={() => openQuote(request)}>Solicitar cotización</Button> : <Badge variant="outline">Sin acción pendiente</Badge>}
                </div>
                {quotes.length ? <div className="mt-4 space-y-2 border-t pt-3">{quotes.map((quote) => <div key={quote.id} className="flex items-center justify-between gap-3 text-sm"><div><span className="font-medium">{quote.quotation_number}</span><span className="ml-2 text-muted-foreground">{quote.status === 'requested' ? `Solicitud enviada · ${quote.lead_time_days || 0} días` : `${money(quote.total_amount)} · ${quote.lead_time_days || 0} días`}</span></div><Badge variant="secondary">{procurementStatusLabel(quote.status)}</Badge></div>)}</div> : null}
              </div>;
            })}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle>Órdenes y recepciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!orders.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Las OC emitidas desde cotizaciones aparecerán aquí.</p> : null}
            {orders.map((order) => {
              const lines = orderLines.filter((line) => line.purchase_order_id === order.id);
              const pending = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity || 0) - Number(line.quantity_received || 0)), 0);
              return <div key={order.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{order.order_number}</p><Badge variant="outline">{procurementStatusLabel(order.operational_status || order.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{order.supplier_name || 'Proveedor'} · {money(order.total_amount)}</p><p className="mt-2 text-sm">{lines.length} línea(s) · {pending} unidad(es) pendientes</p></div>{pending > 0 ? <Button size="sm" onClick={() => openReceive(order)}>Registrar recepción</Button> : <Button size="sm" variant="outline" asChild><Link href="/dashboard/compras/facturas">Continuar a factura</Link></Button>}</div></div>;
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Continuidad financiera</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/dashboard/compras/facturas"><ReceiptText className="mr-2 h-4 w-4" />Facturas</Link></Button><Button asChild variant="outline"><Link href="/dashboard/finanzas/pagos"><WalletCards className="mr-2 h-4 w-4" />Pagos</Link></Button></div></CardContent></Card>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Nueva solicitud de compra</DialogTitle><DialogDescription>Selecciona productos canónicos. La solicitud podrá vincularse después a cotizaciones y OC.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label>Prioridad</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div><div><Label>Fecha requerida</Label><Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} /></div></div>
          <div><Label>Justificación</Label><Textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Necesidad operacional, OT o reposición" /></div>
          <div><Label>Buscar producto</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Código o nombre" /></div>{productData?.products?.length ? <div className="mt-2 max-h-52 overflow-auto rounded-md border">{productData.products.map((product: Product) => <button key={product.id} type="button" className="flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted" onClick={() => { if (!draftLines.some((line) => line.product.id === product.id)) setDraftLines([...draftLines, { product, quantity: 1 }]); setProductQuery(''); }}><ProductPhoto media={product.media} name={product.name} size="sm"/><span className="min-w-0 flex-1"><strong>{product.product_code}</strong> · {product.name}<span className="block text-xs text-muted-foreground">{product.media?.status === 'approved' ? 'Foto IA validada' : 'Foto pendiente'}</span></span><Plus className="h-4 w-4 shrink-0" /></button>)}</div> : null}</div>
          <div className="space-y-2">{draftLines.map((line, index) => <div key={line.product.id} className="grid grid-cols-[auto_1fr_100px_auto] items-center gap-2 rounded-md border p-3"><ProductPhoto media={line.product.media} name={line.product.name} size="sm"/><div><p className="text-sm font-medium">{line.product.product_code} · {line.product.name}</p><p className="text-xs text-muted-foreground">{line.product.unit || 'unidad'} · {line.product.media?.status === 'approved' ? 'Foto validada' : 'Foto pendiente'}</p></div><Input type="number" min="1" value={line.quantity} onChange={(e) => setDraftLines(draftLines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(e.target.value) } : item))} /><Button variant="ghost" size="sm" onClick={() => setDraftLines(draftLines.filter((_, itemIndex) => itemIndex !== index))}>Quitar</Button></div>)}</div>
          <DialogFooter><Button variant="outline" onClick={() => setRequestOpen(false)}>Cancelar</Button><Button onClick={createRequest} disabled={busy}>{busy ? 'Guardando...' : 'Crear solicitud'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quoteRequest)} onOpenChange={(open) => !open && setQuoteRequest(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Solicitar cotización</DialogTitle><DialogDescription>{quoteRequest?.request_number}: selecciona proveedor usando el historial como referencia. No se ingresa precio en esta etapa.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-muted-foreground"/><Label>Proveedores recomendados</Label></div>
            {supplierRecommendationsLoading ? <p className="text-sm text-muted-foreground">Analizando historial de compras...</p> : recommendedSuppliers.length ? <div className="grid gap-2 sm:grid-cols-2">{recommendedSuppliers.map((supplier, index) => <button key={supplier.id} type="button" onClick={() => chooseSupplier(supplier)} className={`rounded-md border p-3 text-left transition-colors hover:bg-muted ${selectedSupplier?.id === supplier.id ? 'border-foreground bg-muted/40' : ''}`}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium">{supplier.trade_name || supplier.legal_name}</p><p className="text-xs text-muted-foreground">{supplier.tax_id}</p></div>{index === 0 ? <Badge variant="secondary">Recomendado</Badge> : null}</div><p className="mt-2 text-xs">Cubre {supplier.covered_products || 0} producto(s) · {supplier.order_count || 0} compra(s)</p><p className="mt-1 text-xs text-muted-foreground">Última: {dateLabel(supplier.last_order_date)}{supplier.last_order_number ? ` · ${supplier.last_order_number}` : ''}{supplier.last_unit_cost != null ? ` · Ref. ${money(supplier.last_unit_cost)}` : ''}</p></button>)}</div> : <p className="text-sm text-muted-foreground">No hay compras históricas suficientes para recomendar un proveedor.</p>}
            {recentSuppliers.length ? <div><p className="mb-2 text-xs font-medium text-muted-foreground">Últimos proveedores usados</p><div className="flex flex-wrap gap-2">{recentSuppliers.map((supplier) => <Button key={`recent-${supplier.id}`} type="button" size="sm" variant={selectedSupplier?.id === supplier.id ? 'secondary' : 'outline'} onClick={() => chooseSupplier(supplier)}>{supplier.trade_name || supplier.legal_name} · {dateLabel(supplier.order_date)}</Button>)}</div></div> : null}
          </div>
          <div><Label>Buscar otro proveedor</Label><Input value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} placeholder="RUT o razón social" />{selectedSupplier ? <div className="mt-2 rounded-md border p-3 text-sm"><strong>{selectedSupplier.trade_name || selectedSupplier.legal_name}</strong><span className="ml-2 text-muted-foreground">{selectedSupplier.tax_id}</span></div> : supplierData?.suppliers?.length ? <div className="mt-2 max-h-36 overflow-auto rounded-md border">{supplierData.suppliers.map((supplier: Supplier) => <button key={supplier.id} type="button" className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted" onClick={() => chooseSupplier(supplier)}>{supplier.trade_name || supplier.legal_name} · {supplier.tax_id}</button>)}</div> : null}</div>
          <div><Label>Plazo de entrega estimado (días)</Label><Input type="number" min="0" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} /></div>
          <div className="space-y-2">{requestLines.filter((line) => line.request_id === quoteRequest?.id).map((line) => <div key={line.id} className="rounded-md border p-3"><p className="text-sm font-medium">{line.product_code} · {line.description}</p><p className="text-xs text-muted-foreground">Cantidad {line.quantity} {line.unit || ''}</p>{line.historical_unit_cost != null ? <div className="mt-2 rounded-md bg-muted/40 px-2.5 py-2"><p className="text-xs font-medium">Precio de referencia por {line.unit || 'unidad'}: {money(line.historical_unit_cost)} {line.historical_currency || 'CLP'}</p><p className="mt-0.5 text-xs text-muted-foreground">Última compra {dateLabel(line.historical_price_date)}{line.historical_supplier_name ? ` · ${line.historical_supplier_name}` : ''}{line.historical_order_number ? ` · ${line.historical_order_number}` : ''}</p></div> : <p className="mt-2 text-xs text-muted-foreground">Sin precio histórico de referencia para este producto.</p>}</div>)}</div>
          <DialogFooter><Button variant="outline" onClick={() => setQuoteRequest(null)}>Cancelar</Button><Button onClick={createQuotation} disabled={busy || !selectedSupplier}>{busy ? 'Guardando...' : 'Solicitar cotización'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receiveOrder)} onOpenChange={(open) => !open && setReceiveOrder(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Registrar recepción</DialogTitle><DialogDescription>{receiveOrder?.order_number}: solo se incorporará a stock la cantidad aceptada.</DialogDescription></DialogHeader>
          <div className="space-y-2">{orderLines.filter((line) => line.purchase_order_id === receiveOrder?.id).map((line) => { const remaining = Math.max(0, Number(line.quantity || 0) - Number(line.quantity_received || 0)); return <div key={line.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_160px]"><div><p className="text-sm font-medium">{line.product_code} · {line.description}</p><p className="text-xs text-muted-foreground">Ordenado {line.quantity} · recibido {line.quantity_received || 0} · pendiente {remaining}</p></div><div><Label>Recibir ahora</Label><Input type="number" min="0" max={remaining} value={receiptQuantities[line.id] || ''} onChange={(e) => setReceiptQuantities({ ...receiptQuantities, [line.id]: e.target.value })} /></div></div>; })}</div>
          <DialogFooter><Button variant="outline" onClick={() => setReceiveOrder(null)}>Cancelar</Button><Button onClick={receive} disabled={busy}>{busy ? 'Procesando...' : 'Confirmar recepción'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}