'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, Clock3, Landmark, ReceiptText, ShieldCheck, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar cuentas por pagar');
  return payload;
};

const money = (value: unknown, currency = 'CLP') => {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString('es-CL')}`;
  }
};

const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

type Payable = {
  id: string;
  invoice_number: string;
  supplier_name: string;
  approved_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date?: string | null;
  days_to_due?: number | null;
  status: string;
  currency: string;
};

type Payment = {
  id: string;
  payable_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_reference?: string | null;
  notes?: string | null;
  reconciled_at?: string | null;
  reconciliation_reference?: string | null;
};

type PaymentRequest = {
  id: string;
  payable_id: string;
  amount: number;
  currency: string;
  requested_payment_date?: string | null;
  status: 'pending_signatures' | 'approved' | 'executed' | 'rejected' | 'cancelled';
  required_signatures: number;
  signature_count: number;
  signed_by_me: boolean;
  request_note?: string | null;
  created_at: string;
  executed_at?: string | null;
  bank_reference?: string | null;
  evidence_document_id?: string | null;
};

type DialogMode = 'due' | 'request' | 'execute' | 'reconcile' | null;

export default function PayablesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/finance/payables', fetcher, { revalidateOnFocus: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [reconciliationReference, setReconciliationReference] = useState('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  const payables: Payable[] = data?.payables || [];
  const payments: Payment[] = data?.payments || [];
  const requests: PaymentRequest[] = data?.paymentRequests || [];
  const canEdit = data?.canEdit === true;

  const payableById = useMemo(() => new Map(payables.map((row) => [row.id, row])), [payables]);
  const openRequestByPayable = useMemo(
    () => new Map(requests.filter((row) => ['pending_signatures', 'approved'].includes(row.status)).map((row) => [row.payable_id, row])),
    [requests],
  );

  const outstandingByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of payables) {
      const currency = row.currency || 'CLP';
      totals.set(currency, (totals.get(currency) || 0) + Number(row.outstanding_amount || 0));
    }
    return [...totals.entries()].filter(([, value]) => value > 0);
  }, [payables]);

  const dueMissing = payables.filter((row) => !row.due_date && Number(row.outstanding_amount) > 0);
  const overdue = payables.filter((row) => row.days_to_due != null && row.days_to_due < 0 && Number(row.outstanding_amount) > 0);
  const unreconciled = payments.filter((row) => !row.reconciled_at);
  const pendingSignatures = requests.filter((row) => row.status === 'pending_signatures');
  const readyToExecute = requests.filter((row) => row.status === 'approved');

  const post = async (body: unknown) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/finance/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo completar la operación');
      await mutate();
      return payload;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo completar la operación');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedPayable(null);
    setSelectedRequest(null);
    setSelectedPayment(null);
    setDueDate('');
    setRequestAmount('');
    setRequestDate('');
    setRequestNotes('');
    setBankReference('');
    setTransferDate('');
    setTransferNotes('');
    setTransferProof(null);
    setReconciliationReference('');
    setReconciliationNotes('');
  };

  const openDue = (row: Payable) => {
    setSelectedPayable(row);
    setDueDate(row.due_date || '');
    setDialogMode('due');
    setMessage(null);
  };

  const openRequest = (row: Payable) => {
    setSelectedPayable(row);
    setRequestAmount(String(Number(row.outstanding_amount || 0)));
    setRequestDate(localDate());
    setRequestNotes('');
    setDialogMode('request');
    setMessage(null);
  };

  const openExecute = (row: PaymentRequest) => {
    setSelectedRequest(row);
    setBankReference('');
    setTransferDate(row.requested_payment_date || localDate());
    setTransferNotes('');
    setTransferProof(null);
    setDialogMode('execute');
    setMessage(null);
  };

  const openReconcile = (row: Payment) => {
    setSelectedPayment(row);
    setReconciliationReference('');
    setReconciliationNotes('');
    setDialogMode('reconcile');
    setMessage(null);
  };

  const saveDue = async () => {
    if (!selectedPayable || !dueDate) return;
    if (await post({ action: 'set_due_date', payableId: selectedPayable.id, dueDate })) closeDialog();
  };

  const createRequest = async () => {
    if (!selectedPayable) return;
    const amount = Number(requestAmount);
    if (!Number.isFinite(amount) || amount <= 0) return setMessage('Ingresa un monto válido.');
    if (amount > Number(selectedPayable.outstanding_amount) + 0.0001) return setMessage('La solicitud no puede superar el saldo pendiente.');
    const result = await post({
      action: 'create_payment_request',
      payableId: selectedPayable.id,
      amount,
      paymentDate: requestDate || null,
      notes: requestNotes.trim() || null,
    });
    if (result) closeDialog();
  };

  const signRequest = async (requestId: string) => {
    await post({ action: 'sign_payment_request', requestId });
  };

  const executeRequest = async () => {
    if (!selectedRequest) return;
    if (!bankReference.trim()) return setMessage('Ingresa la referencia bancaria.');
    if (!transferDate) return setMessage('Ingresa la fecha real de la transferencia.');
    if (!transferProof) return setMessage('Adjunta el comprobante de transferencia.');

    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', transferProof);
      form.append('module', 'finanzas');
      form.append('category', 'comprobantes-transferencia');
      form.append('title', `Transferencia ${bankReference.trim()}`);
      form.append('documentType', 'comprobante-pago');
      form.append('description', 'Evidencia bancaria de transferencia de proveedor');

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const upload = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !upload?.documentId) {
        throw new Error(upload?.error || 'No se pudo cargar el comprobante');
      }

      const response = await fetch('/api/finance/payables', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_payment_request',
          requestId: selectedRequest.id,
          reference: bankReference.trim(),
          paymentDate: transferDate,
          notes: transferNotes.trim() || null,
          evidenceDocumentId: upload.documentId,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar la transferencia');
      await mutate();
      closeDialog();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo registrar la transferencia');
    } finally {
      setBusy(false);
    }
  };

  const saveReconciliation = async () => {
    if (!selectedPayment) return;
    if (!reconciliationReference.trim()) return setMessage('La conciliación requiere una referencia bancaria o contable.');
    if (await post({
      action: 'reconcile_payment',
      paymentId: selectedPayment.id,
      reference: reconciliationReference.trim(),
      notes: reconciliationNotes.trim() || null,
    })) closeDialog();
  };

  let nextTitle = 'Sin acción pendiente';
  let nextDescription = 'No hay obligaciones de pago que requieran intervención.';
  let nextControl: React.ReactNode = null;

  const unsigned = pendingSignatures.find((row) => !row.signed_by_me);
  if (unsigned) {
    const payable = payableById.get(unsigned.payable_id);
    nextTitle = 'Firmar transferencia';
    nextDescription = `Factura ${payable?.invoice_number || '—'}: ${unsigned.signature_count}/${unsigned.required_signatures} firmas registradas.`;
    nextControl = <Button onClick={() => void signRequest(unsigned.id)} disabled={!canEdit || busy}><ShieldCheck className="mr-2 h-4 w-4" />Firmar</Button>;
  } else if (readyToExecute.length) {
    const payable = payableById.get(readyToExecute[0].payable_id);
    nextTitle = 'Ejecutar transferencia';
    nextDescription = `Factura ${payable?.invoice_number || '—'}: ya cuenta con dos firmas distintas.`;
    nextControl = <Button onClick={() => openExecute(readyToExecute[0])} disabled={!canEdit}><Landmark className="mr-2 h-4 w-4" />Registrar transferencia</Button>;
  } else if (dueMissing.length) {
    nextTitle = 'Definir vencimiento';
    nextDescription = `Factura ${dueMissing[0].invoice_number}: la obligación aprobada aún no tiene fecha de vencimiento.`;
    nextControl = <Button onClick={() => openDue(dueMissing[0])} disabled={!canEdit}><Clock3 className="mr-2 h-4 w-4" />Definir vencimiento</Button>;
  } else if (overdue.length && !openRequestByPayable.has(overdue[0].id)) {
    nextTitle = 'Solicitar transferencia vencida';
    nextDescription = `Factura ${overdue[0].invoice_number}: lleva ${Math.abs(Number(overdue[0].days_to_due || 0))} día(s) vencida.`;
    nextControl = <Button onClick={() => openRequest(overdue[0])} disabled={!canEdit}><ReceiptText className="mr-2 h-4 w-4" />Solicitar transferencia</Button>;
  } else if (unreconciled.length) {
    nextTitle = 'Conciliar pago';
    nextDescription = `Pago de ${money(unreconciled[0].amount, unreconciled[0].currency || 'CLP')} ejecutado y aún no conciliado.`;
    nextControl = <Button onClick={() => openReconcile(unreconciled[0])} disabled={!canEdit}><Landmark className="mr-2 h-4 w-4" />Conciliar</Button>;
  }

  return <div className="space-y-6">
    <section className="border-b border-border/70 pb-6">
      <p className="text-sm font-medium text-muted-foreground">Finanzas · Tesorería</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Factura → 2 firmas → transferencia → evidencia → conciliación</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Ninguna transferencia se registra como pago sin dos firmas distintas. El comprobante queda en Documentos de Finanzas y la conciliación conserva la referencia bancaria.
      </p>
    </section>

    {message ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{message}</div> : null}
    {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inbox de Tesorería</p>
          <p className="mt-1 text-lg font-semibold">{nextTitle}</p>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{nextDescription}</p>
        </div>
        {nextControl}
      </CardContent>
    </Card>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Saldo pendiente</p>{outstandingByCurrency.length ? outstandingByCurrency.map(([currency,value]) => <p key={currency} className="mt-1 text-xl font-semibold">{money(value,currency)}</p>) : <p className="mt-1 text-2xl font-semibold">0</p>}</CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Vencidas</p><p className="mt-1 text-2xl font-semibold">{overdue.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Esperan firmas</p><p className="mt-1 text-2xl font-semibold">{pendingSignatures.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Listas para transferir</p><p className="mt-1 text-2xl font-semibold">{readyToExecute.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Por conciliar</p><p className="mt-1 text-2xl font-semibold">{unreconciled.length}</p></CardContent></Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle>Facturas y vencimientos</CardTitle><CardDescription>El atraso se calcula contra la fecha de vencimiento registrada; Motil no inventa fechas faltantes.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : null}
        {!isLoading && !payables.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay facturas aprobadas para pago.</p> : null}
        {payables.map((row) => {
          const openRequest = openRequestByPayable.get(row.id);
          const overdueDays = row.days_to_due != null && row.days_to_due < 0 ? Math.abs(row.days_to_due) : 0;
          return <div key={row.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">Factura {row.invoice_number}</p>
                  <Badge variant="outline">{row.status}</Badge>
                  {overdueDays > 0 ? <Badge variant="destructive">{overdueDays} día(s) vencida</Badge> : null}
                  {openRequest ? <Badge variant="secondary">{openRequest.signature_count}/{openRequest.required_signatures} firmas</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.supplier_name} · aprobado {money(row.approved_amount,row.currency)} · pagado {money(row.paid_amount,row.currency)}</p>
                <p className="mt-1 text-sm">Saldo {money(row.outstanding_amount,row.currency)}{row.due_date ? ` · vence ${row.due_date}` : ' · vencimiento pendiente'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!row.due_date && canEdit ? <Button size="sm" variant="outline" onClick={() => openDue(row)}>Definir vencimiento</Button> : null}
                {row.due_date && Number(row.outstanding_amount) > 0 && !openRequest && canEdit ? <Button size="sm" variant="outline" onClick={() => openRequest(row)}><ReceiptText className="mr-2 h-4 w-4" />Solicitar transferencia</Button> : null}
              </div>
            </div>
          </div>;
        })}
      </CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle>Transferencias</CardTitle><CardDescription>Dos firmas distintas antes de ejecución. Luego queda referencia, comprobante, usuario y timestamp.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {!requests.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay solicitudes de transferencia.</p> : null}
        {requests.map((row) => {
          const payable = payableById.get(row.payable_id);
          return <div key={row.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Factura {payable?.invoice_number || '—'} · {money(row.amount,row.currency)}</p>
                <Badge variant="outline">{row.status}</Badge>
                <Badge variant="secondary">{row.signature_count}/{row.required_signatures} firmas</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.status === 'executed' ? `Transferida ${row.executed_at || ''} · ${row.bank_reference || 'sin referencia'}` : row.requested_payment_date ? `Fecha solicitada ${row.requested_payment_date}` : 'Sin fecha solicitada'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.status === 'pending_signatures' && !row.signed_by_me && canEdit ? <Button size="sm" variant="outline" onClick={() => void signRequest(row.id)} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4" />Firmar</Button> : null}
              {row.status === 'approved' && canEdit ? <Button size="sm" onClick={() => openExecute(row)}><Landmark className="mr-2 h-4 w-4" />Transferencia hecha</Button> : null}
              {row.status === 'executed' ? <Badge><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Ejecutada</Badge> : null}
            </div>
          </div>;
        })}
      </CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle>Pagos y conciliación</CardTitle><CardDescription>La conciliación confirma la salida de caja contra evidencia bancaria o contable.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {!payments.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay pagos registrados.</p> : null}
        {payments.map((row) => <div key={row.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">{money(row.amount,row.currency || 'CLP')} · {row.payment_date}</p><p className="text-sm text-muted-foreground">{row.payment_reference || 'Sin referencia de pago'}</p></div>
          {row.reconciled_at ? <Badge><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Conciliado</Badge> : canEdit ? <Button size="sm" variant="outline" onClick={() => openReconcile(row)}><Landmark className="mr-2 h-4 w-4" />Conciliar</Button> : <Badge variant="outline"><Clock3 className="mr-1 h-3.5 w-3.5" />Pendiente</Badge>}
        </div>)}
      </CardContent>
    </Card>

    <Dialog open={dialogMode === 'due'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Definir vencimiento</DialogTitle><DialogDescription>Factura {selectedPayable?.invoice_number}. Usa la fecha contractual o documental real.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label>Fecha de vencimiento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={saveDue} disabled={busy || !dueDate}>{busy ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={dialogMode === 'request'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar transferencia</DialogTitle><DialogDescription>Esta solicitud quedará pendiente hasta reunir dos firmas distintas.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Monto</Label><Input type="number" min="0" step="any" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} /></div>
          <div className="space-y-2"><Label>Fecha objetivo</Label><Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Nota</Label><Textarea value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} placeholder="Contexto opcional" /></div>
        <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={createRequest} disabled={busy || Number(requestAmount) <= 0}>{busy ? 'Creando…' : 'Enviar a firmas'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={dialogMode === 'execute'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar transferencia ejecutada</DialogTitle><DialogDescription>Requiere dos firmas previas y comprobante bancario.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Referencia bancaria</Label><Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} /></div>
          <div className="space-y-2"><Label>Fecha real</Label><Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Comprobante</Label><Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setTransferProof(e.target.files?.[0] || null)} /><p className="text-xs text-muted-foreground"><Upload className="mr-1 inline h-3.5 w-3.5" />Se guarda como documento operacional de Finanzas.</p></div>
        <div className="space-y-2"><Label>Notas</Label><Textarea value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={executeRequest} disabled={busy || !bankReference.trim() || !transferProof}>{busy ? 'Registrando…' : 'Confirmar transferencia'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={dialogMode === 'reconcile'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Conciliar pago</DialogTitle><DialogDescription>Confirma el movimiento contra evidencia bancaria o contable.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label>Referencia de conciliación</Label><Input value={reconciliationReference} onChange={(e) => setReconciliationReference(e.target.value)} /></div>
        <div className="space-y-2"><Label>Notas</Label><Textarea value={reconciliationNotes} onChange={(e) => setReconciliationNotes(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={saveReconciliation} disabled={busy || !reconciliationReference.trim()}>{busy ? 'Conciliando…' : 'Confirmar conciliación'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
