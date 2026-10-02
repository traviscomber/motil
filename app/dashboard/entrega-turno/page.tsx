'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, RefreshCw, Repeat2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Handover = { id: string; outgoing_person_id: string; incoming_person_id: string; work_order_id: string | null; canonical_asset_id: string | null; summary: string; risk: string | null; status: 'open' | 'received'; created_at: string; received_at: string | null };
type Person = { id: string; full_name: string | null; role_title: string | null };
type WorkOrder = { id: string; work_order_number: string | null; title: string | null; status: string | null; priority: string | null; canonical_asset_id: string | null };
type Asset = { id: string; asset_code: string | null; asset_name: string | null; location: string | null };
type Data = { person: Person | null; handovers: Handover[]; people: Person[]; workOrders: WorkOrder[]; assets: Asset[] };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar');
  return payload as Data;
};

export default function EntregaTurnoPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/operations/handovers', fetcher, { revalidateOnFocus: false });
  const [incomingPersonId, setIncomingPersonId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('none');
  const [assetId, setAssetId] = useState('none');
  const [summary, setSummary] = useState('');
  const [risk, setRisk] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map((data?.people || []).map((row) => [row.id, row])), [data?.people]);
  const workOrdersById = useMemo(() => new Map((data?.workOrders || []).map((row) => [row.id, row])), [data?.workOrders]);
  const assetsById = useMemo(() => new Map((data?.assets || []).map((row) => [row.id, row])), [data?.assets]);
  const incoming = (data?.handovers || []).filter((row) => row.incoming_person_id === data?.person?.id && row.status === 'open');
  const recent = data?.handovers || [];

  async function createHandover(event: FormEvent) {
    event.preventDefault();
    if (!incomingPersonId || !summary.trim()) return;
    setSaving(true); setMessage(null);
    const response = await fetch('/api/operations/handovers', {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ incomingPersonId, workOrderId: workOrderId === 'none' ? null : workOrderId, canonicalAssetId: assetId === 'none' ? null : assetId, summary: summary.trim(), risk: risk.trim() || null }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo registrar la entrega.'); return; }
    setSummary(''); setRisk(''); setWorkOrderId('none'); setAssetId('none');
    setMessage('Entrega registrada para el siguiente responsable.');
    await mutate();
  }

  async function receive(id: string) {
    setSaving(true); setMessage(null);
    const response = await fetch('/api/operations/handovers', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo confirmar.'); return; }
    setMessage('Recepción confirmada.');
    await mutate();
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Continuidad operacional</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Entrega de turno</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Entrega pendientes concretos al siguiente responsable, vinculados a la OT o equipo cuando corresponda.</p></div><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></section>
    {message && <div className="border-y py-3 text-sm">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="h-fit"><h2 className="mb-3 text-base font-semibold">Nueva entrega</h2><form className="space-y-4" onSubmit={createHandover}>
        <div className="space-y-2"><Label>Recibe</Label><Select value={incomingPersonId} onValueChange={setIncomingPersonId}><SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger><SelectContent>{(data?.people || []).filter((row) => row.id !== data?.person?.id).map((row) => <SelectItem key={row.id} value={row.id}>{row.full_name || 'Persona'}{row.role_title ? ` · ${row.role_title}` : ''}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>OT relacionada</Label><Select value={workOrderId} onValueChange={(value) => { setWorkOrderId(value); const row = workOrdersById.get(value); if (row?.canonical_asset_id) setAssetId(row.canonical_asset_id); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin OT</SelectItem>{(data?.workOrders || []).map((row) => <SelectItem key={row.id} value={row.id}>{row.work_order_number || 'OT'} · {row.title || 'Sin título'}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Equipo relacionado</Label><Select value={assetId} onValueChange={setAssetId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin equipo</SelectItem>{(data?.assets || []).map((row) => <SelectItem key={row.id} value={row.id}>{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Qué debe continuar</Label><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} placeholder="Describe el pendiente concreto que recibe el siguiente turno" /></div>
        <div className="space-y-2"><Label>Riesgo o condición importante</Label><Textarea value={risk} onChange={(event) => setRisk(event.target.value)} rows={3} placeholder="Opcional" /></div>
        <Button className="w-full" disabled={saving || !incomingPersonId || !summary.trim()}><Repeat2 className="mr-2 h-4 w-4" />Registrar entrega</Button>
      </form></section>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-lg border"><div className="border-b px-4 py-3"><h2 className="text-base font-semibold">Pendientes que recibes</h2></div><div>{incoming.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No tienes entregas pendientes de confirmar.</div> : <div className="divide-y border-t">{incoming.map((row) => <div key={row.id} className="p-4"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant="secondary">Pendiente de recepción</Badge>{row.work_order_id && <Badge variant="outline">{workOrdersById.get(row.work_order_id)?.work_order_number || 'OT'}</Badge>}</div><p className="mt-3 font-medium">{row.summary}</p>{row.risk && <p className="mt-2 flex gap-2 text-sm text-muted-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{row.risk}</p>}<p className="mt-2 text-xs text-muted-foreground">Entrega: {peopleById.get(row.outgoing_person_id)?.full_name || 'Persona'} · {new Date(row.created_at).toLocaleString('es-CL')}</p>{row.canonical_asset_id && <p className="mt-1 text-xs text-muted-foreground">Equipo: {assetsById.get(row.canonical_asset_id)?.asset_name || 'Equipo'}</p>}</div><Button size="sm" disabled={saving} onClick={() => void receive(row.id)}><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar recepción</Button></div></div>)}</div>}</div></section>
        <section className="overflow-hidden rounded-lg border"><div className="border-b px-4 py-3"><h2 className="text-base font-semibold">Historial reciente</h2></div><div>{error ? <div className="p-6 text-sm text-muted-foreground">No se pudo cargar.</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : recent.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Todavía no hay entregas registradas.</div> : <div className="divide-y border-t">{recent.slice(0, 30).map((row) => <div key={row.id} className="p-4"><div className="flex flex-wrap gap-2"><Badge variant={row.status === 'received' ? 'secondary' : 'outline'}>{row.status === 'received' ? 'Recibida' : 'Pendiente'}</Badge><span className="text-xs text-muted-foreground">{peopleById.get(row.outgoing_person_id)?.full_name || 'Persona'} → {peopleById.get(row.incoming_person_id)?.full_name || 'Persona'}</span></div><p className="mt-2 text-sm font-medium">{row.summary}</p></div>)}</div>}</div></section>
      </div>
    </div>
  </div>;
}
