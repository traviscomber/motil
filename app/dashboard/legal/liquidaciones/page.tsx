'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';

type ShipmentOption = {
  id: string;
  shipment_date: string | null;
  shipment_number: string | null;
  destination: string | null;
  carrier_name_raw: string | null;
  vehicle_plate_raw: string | null;
  normalized_metric_tons: number | null;
  validation_status: string | null;
};

type SettlementItem = {
  id: string;
  settlement_number: string;
  settlement_date: string;
  currency: string;
  gross_amount: number | null;
  deductions_amount: number | null;
  net_amount: number | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  document: { document_name: string; document_code: string | null } | null;
  contract: { contract_number: string | null; title: string | null; contractor_name: string | null } | null;
  payment: { status: string; amount: number; currency: string; executed_at: string | null } | null;
  shipments: Array<{
    shipment_id: string;
    settled_metric_tons: number | null;
    shipment: ShipmentOption | null;
  }>;
};

type Payload = {
  data: SettlementItem[];
  shipmentOptions: ShipmentOption[];
  contractOptions: Array<{ id: string; contract_number: string | null; title: string | null; contractor_name: string | null }>;
  documentOptions: Array<{ id: string; document_name: string; document_code: string | null }>;
  accessLevel: 'ED' | 'LEC';
  schemaReady: boolean;
  summary: {
    total: number;
    submitted: number;
    approved: number;
    paid: number;
    without_document: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las liquidaciones');
  return payload;
};

function money(value: number | null, currency: string) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MineralSettlementsPage() {
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/legal/mineral-settlements', fetcher, {
    revalidateOnFocus: false,
  });

  const [settlementNumber, setSettlementNumber] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [contractId, setContractId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [currency, setCurrency] = useState('CLP');
  const [grossAmount, setGrossAmount] = useState('');
  const [deductionsAmount, setDeductionsAmount] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando liquidaciones" description="Cruzando embarques, contratos, documentos y pagos." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="Liquidaciones no disponibles" description="No se sustituyen datos faltantes por supuestos." />;
  }

  const canWrite = data.accessLevel === 'ED' && data.schemaReady;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await fetch('/api/legal/mineral-settlements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          settlement_number: settlementNumber,
          settlement_date: settlementDate,
          contract_id: contractId || null,
          settlement_document_id: documentId || null,
          shipment_ids: shipmentId ? [shipmentId] : [],
          currency,
          gross_amount: grossAmount || null,
          deductions_amount: deductionsAmount || null,
          net_amount: netAmount || null,
          due_date: dueDate || null,
          notes: notes || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionMessage(payload?.error || 'No se pudo registrar la liquidación.');
        return;
      }

      setSettlementNumber('');
      setSettlementDate('');
      setContractId('');
      setDocumentId('');
      setShipmentId('');
      setGrossAmount('');
      setDeductionsAmount('');
      setNetAmount('');
      setDueDate('');
      setNotes('');
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · Mineral</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Liquidaciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Embarque operacional → liquidación → documento → pago, sin duplicar la verdad de transporte ni Finanzas.
        </p>
      </header>

      {!data.schemaReady ? (
        <StatePanel
          tone="warning"
          title="Liquidaciones preparadas, pendientes de migración"
          description="La estructura y la interfaz están en esta rama; la tabla productiva aún no existe."
          className="min-h-0"
        />
      ) : null}

      {actionMessage ? <StatePanel tone="warning" title="Acción no aplicada" description={actionMessage} className="min-h-0" /> : null}

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-5">
        {[
          ['Liquidaciones', data.summary.total],
          ['En revisión', data.summary.submitted],
          ['Aprobadas', data.summary.approved],
          ['Pagadas', data.summary.paid],
          ['Sin documento', data.summary.without_document],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {data.accessLevel === 'ED' ? (
        <form onSubmit={submit} className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nº liquidación</label>
            <Input className="mt-1" value={settlementNumber} onChange={(e) => setSettlementNumber(e.target.value)} disabled={!canWrite} />
          </div>
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Input className="mt-1" type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} disabled={!canWrite} />
          </div>

          <div>
            <label className="text-sm font-medium">Embarque</label>
            <Select value={shipmentId} onValueChange={setShipmentId} disabled={!canWrite}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar embarque" /></SelectTrigger>
              <SelectContent>
                {data.shipmentOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {[item.shipment_number, item.shipment_date, item.destination].filter(Boolean).join(' · ') || item.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Contrato relacionado</label>
            <Select value={contractId} onValueChange={setContractId} disabled={!canWrite}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {data.contractOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {[item.contract_number, item.title, item.contractor_name].filter(Boolean).join(' · ') || item.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Documento de liquidación</label>
            <Select value={documentId} onValueChange={setDocumentId} disabled={!canWrite}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Documento Legal canónico" /></SelectTrigger>
              <SelectContent>
                {data.documentOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {[item.document_code, item.document_name].filter(Boolean).join(' · ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Monto bruto</label>
            <Input className="mt-1" type="number" min="0" step="0.01" value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)} disabled={!canWrite} />
          </div>
          <div>
            <label className="text-sm font-medium">Deducciones</label>
            <Input className="mt-1" type="number" min="0" step="0.01" value={deductionsAmount} onChange={(e) => setDeductionsAmount(e.target.value)} disabled={!canWrite} />
          </div>
          <div>
            <label className="text-sm font-medium">Monto neto</label>
            <Input className="mt-1" type="number" min="0" step="0.01" value={netAmount} onChange={(e) => setNetAmount(e.target.value)} disabled={!canWrite} />
          </div>
          <div>
            <label className="text-sm font-medium">Moneda</label>
            <Input className="mt-1" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} disabled={!canWrite} />
          </div>
          <div>
            <label className="text-sm font-medium">Vencimiento</label>
            <Input className="mt-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canWrite} />
          </div>
          <div>
            <label className="text-sm font-medium">Nota</label>
            <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canWrite} />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={!canWrite || saving || !settlementNumber || !settlementDate || !shipmentId}>
              Registrar liquidación
            </Button>
          </div>
        </form>
      ) : null}

      <section className="divide-y overflow-hidden rounded-md border">
        {data.data.length ? data.data.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.status}</Badge>
                  {!item.document ? <Badge variant="destructive">Sin documento</Badge> : null}
                  {item.payment?.executed_at ? <Badge variant="secondary">Pagada</Badge> : null}
                </div>
                <h2 className="mt-2 text-sm font-semibold">Liquidación {item.settlement_number}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[item.contract?.title, item.contract?.contractor_name].filter(Boolean).join(' · ') || 'Sin contrato vinculado'}
                </p>
                <p className="mt-2 text-sm">{item.shipments.length} embarque(s) vinculado(s)</p>
              </div>

              <div className="text-xs text-muted-foreground md:text-right">
                <p>{item.settlement_date}</p>
                <p className="mt-1">Neto: {money(item.net_amount, item.currency)}</p>
                <p className="mt-1">{item.due_date ? `Vence: ${item.due_date}` : 'Sin vencimiento'}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t pt-3 text-xs text-muted-foreground md:grid-cols-4">
              <p><span className="font-medium text-foreground">Bruto</span><br />{money(item.gross_amount, item.currency)}</p>
              <p><span className="font-medium text-foreground">Deducciones</span><br />{money(item.deductions_amount, item.currency)}</p>
              <p><span className="font-medium text-foreground">Documento</span><br />{item.document?.document_name || 'No vinculado'}</p>
              <p><span className="font-medium text-foreground">Pago</span><br />{item.payment?.status || 'No vinculado'}</p>
            </div>
          </article>
        )) : (
          <p className="p-4 text-sm text-muted-foreground">
            No hay liquidaciones registradas. Los embarques operacionales existentes no se convierten automáticamente en liquidaciones.
          </p>
        )}
      </section>
    </div>
  );
}
