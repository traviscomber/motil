'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatePanel } from '@/components/ui/state-panel';

type SourceType = 'work_order' | 'preventive' | 'maintenance_document' | 'automation_run';
type SourceRow = { id: string; [key: string]: unknown };
type Finding = { id: string; source_type: SourceType; source_id: string; criterion: string; finding: string; severity: string; responsible_person_id: string | null; status: 'open' | 'resolved'; reviewed_at: string; resolution_note: string | null; evidence_reference: string | null; resolved_at: string | null; source: { label: string; href: string } | null };
type Data = { findings: Finding[]; people: Array<{ id: string; full_name: string | null; role_title: string | null }>; sources: Record<SourceType, SourceRow[]> };

const fetcher = async (url: string) => { const response = await fetch(url, { credentials: 'include' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar'); return payload as Data; };
const labels: Record<SourceType, string> = { work_order: 'Orden de trabajo', preventive: 'Plan preventivo', maintenance_document: 'Registro documental', automation_run: 'Ejecución de automatización' };
function sourceLabel(type: SourceType, row: any) { if (type === 'work_order') return `${row.work_order_number || 'OT'} · ${row.title || 'Sin título'}`; if (type === 'preventive') return row.task_name || 'Plan preventivo'; if (type === 'maintenance_document') return row.title || row.expedient_key || 'Registro documental'; return `${row.category || 'Automatización'} · ${row.action_type || row.source_key || 'Ejecución'}`; }

export default function AuditoriaOperacionalPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/audit/operational', fetcher, { revalidateOnFocus: false });
  const [sourceType, setSourceType] = useState<SourceType>('work_order');
  const [sourceId, setSourceId] = useState('');
  const [criterion, setCriterion] = useState('');
  const [finding, setFinding] = useState('');
  const [severity, setSeverity] = useState('observation');
  const [responsiblePersonId, setResponsiblePersonId] = useState('none');
  const [resolutionId, setResolutionId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map((data?.people || []).map((row) => [row.id, row])), [data?.people]);
  const open = (data?.findings || []).filter((row) => row.status === 'open');
  const resolved = (data?.findings || []).filter((row) => row.status === 'resolved');
  const critical = open.filter((row) => row.severity === 'critical').length;
  const summaryUnavailable = isLoading || Boolean(error) || !data;
  const metric = (value: number) => summaryUnavailable ? '—' : value;

  async function createFinding(event: FormEvent) {
    event.preventDefault();
    if (!sourceId || !criterion.trim() || !finding.trim()) return;
    setSaving(true); setMessage(null);
    const response = await fetch('/api/audit/operational', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceType, sourceId, criterion: criterion.trim(), finding: finding.trim(), severity, responsiblePersonId: responsiblePersonId === 'none' ? null : responsiblePersonId }) });
    const payload = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo registrar.'); return; }
    setCriterion(''); setFinding(''); setSourceId(''); setMessage('Hallazgo registrado con referencia a su fuente.'); await mutate();
  }

  async function resolveFinding(event: FormEvent) {
    event.preventDefault();
    if (!resolutionId || !resolutionNote.trim() || !evidenceReference.trim()) return;
    setSaving(true); setMessage(null);
    const response = await fetch('/api/audit/operational', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: resolutionId, resolutionNote: resolutionNote.trim(), evidenceReference: evidenceReference.trim() }) });
    const payload = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo cerrar.'); return; }
    setResolutionId(null); setResolutionNote(''); setEvidenceReference(''); setMessage('Hallazgo cerrado con resolución y evidencia verificable.'); await mutate();
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Auditoría</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Registra hallazgos verificables y ciérralos sólo con evidencia.</p></div><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></section>

    {message ? <Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}
    {error ? <StatePanel tone="error" title="Auditoría no disponible" description="No se muestran ceros ni cierres aparentes mientras falla la fuente canónica." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0" /> : null}

    <div className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Abiertos</p><p className="mt-1 text-2xl font-semibold">{metric(open.length)}</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Críticos</p><p className="mt-1 text-2xl font-semibold">{metric(critical)}</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Cerrados con evidencia</p><p className="mt-1 text-2xl font-semibold">{metric(resolved.length)}</p></div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
      <section className="h-fit"><h2 className="mb-3 text-base font-semibold">Registrar revisión</h2><form className="space-y-4" onSubmit={createFinding}>
        <div className="space-y-2"><Label>Tipo de fuente</Label><Select value={sourceType} onValueChange={(value) => { setSourceType(value as SourceType); setSourceId(''); }} disabled={summaryUnavailable}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Registro revisado</Label><Select value={sourceId} onValueChange={setSourceId} disabled={summaryUnavailable}><SelectTrigger><SelectValue placeholder="Seleccionar registro" /></SelectTrigger><SelectContent>{(data?.sources?.[sourceType] || []).map((row) => <SelectItem key={row.id} value={row.id}>{sourceLabel(sourceType,row)}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Criterio verificado</Label><Textarea value={criterion} onChange={(e)=>setCriterion(e.target.value)} rows={3} placeholder="Qué requisito o condición se revisó" /></div>
        <div className="space-y-2"><Label>Hallazgo</Label><Textarea value={finding} onChange={(e)=>setFinding(e.target.value)} rows={4} placeholder="Qué se observó en el registro" /></div>
        <div className="space-y-2"><Label>Severidad</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="observation">Observación</SelectItem><SelectItem value="minor">Menor</SelectItem><SelectItem value="major">Mayor</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Responsable</Label><Select value={responsiblePersonId} onValueChange={setResponsiblePersonId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin asignar</SelectItem>{(data?.people||[]).map((row)=><SelectItem key={row.id} value={row.id}>{row.full_name || 'Persona'}</SelectItem>)}</SelectContent></Select></div>
        <Button className="w-full" disabled={saving || summaryUnavailable || !sourceId || !criterion.trim() || !finding.trim()}>Registrar hallazgo</Button>
      </form></section>

      <section className="overflow-hidden rounded-lg border"><div className="border-b px-4 py-3"><h2 className="text-base font-semibold">Hallazgos</h2></div><div>
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : error ? <div className="p-6 text-sm text-muted-foreground">La lista no está disponible.</div> : (data?.findings||[]).length===0 ? <div className="p-8 text-center text-sm text-muted-foreground">Todavía no hay hallazgos registrados.</div> : <div className="divide-y border-t">{(data?.findings||[]).map((row)=><div key={row.id} className="p-4"><div className="flex flex-col gap-3 md:flex-row md:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant={row.status==='resolved'?'secondary':'outline'}>{row.status==='resolved'?'Cerrado':'Abierto'}</Badge><Badge variant={row.severity==='critical'?'destructive':'outline'}>{row.severity}</Badge><Badge variant="outline">{labels[row.source_type]}</Badge></div><p className="mt-3 font-medium">{row.finding}</p><p className="mt-1 text-sm text-muted-foreground">Criterio: {row.criterion}</p>{row.responsible_person_id && <p className="mt-1 text-xs text-muted-foreground">Responsable: {peopleById.get(row.responsible_person_id)?.full_name || 'Persona'}</p>}{row.resolution_note && <p className="mt-2 text-sm">Resolución: {row.resolution_note}</p>}{row.evidence_reference && <p className="mt-1 text-xs text-muted-foreground">Evidencia: {row.evidence_reference}</p>}</div><div className="flex shrink-0 gap-2">{row.source?.href && <Button size="sm" variant="outline" asChild><a href={row.source.href}><ExternalLink className="mr-2 h-4 w-4" />Fuente</a></Button>}{row.status==='open' && <Button size="sm" onClick={()=>setResolutionId(row.id)}>Resolver</Button>}</div></div>{resolutionId===row.id && <form onSubmit={resolveFinding} className="mt-4 space-y-3 rounded-lg bg-muted/40 p-4"><Label>Resolución verificada</Label><Textarea value={resolutionNote} onChange={(e)=>setResolutionNote(e.target.value)} rows={3}/><Label>Referencia de evidencia</Label><Input value={evidenceReference} onChange={(e)=>setEvidenceReference(e.target.value)} placeholder="URL, archivo, folio o referencia verificable" required/><p className="text-xs text-muted-foreground">El hallazgo no puede cerrarse sin una referencia de evidencia verificable.</p><div className="flex gap-2"><Button disabled={saving || !resolutionNote.trim() || !evidenceReference.trim()}>Cerrar hallazgo</Button><Button type="button" variant="ghost" onClick={()=>setResolutionId(null)}>Cancelar</Button></div></form>}</div>)}</div>}
      </div></section>
    </div>
  </div>;
}
