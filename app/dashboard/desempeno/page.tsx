'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserRound, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Kpi = { cargo_name: string; domain?: string; kpi_key: string; label: string; unit: string; measured_value: number | null; target_value?: number | null; direction: string; evaluation_state: string };
type Gap = { domain: string; status: string; detail: string };
type Profile = { id: string; full_name: string | null; role: string | null; cargo_id: string | null; cargo_name: string | null };
type Initiative = { id: string; kaizen_number: string | null; title: string; category: string | null; priority: string | null; pdca_stage: string | null; status: string | null; target_date: string | null; expected_result: string | null; actual_result: string | null; estimated_saving: number | null; actual_saving: number | null; verified_at: string | null; standardized_at: string | null };
type Person = { id: string; fullName: string | null; role: string | null; cargoName: string; globalKpiVisibility: boolean; initiatives: Initiative[]; comparablePeriods: string[]; comparableClosures: number; evaluationEligible: boolean };
type Payload = { cargos: string[]; profiles?: Profile[]; rows: Kpi[]; executive: Kpi[]; person?: Person | null; evidenceGaps?: Gap[]; meta: { note: string; personalEvaluation: boolean; targetsDefined: boolean } };

function formatValue(value: number | null, unit: string) {
  if (value === null || value === undefined) return 'Sin dato';
  const maximumFractionDigits = unit === '%' || unit === 'h' || unit === 'nivel' ? 2 : 0;
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value)} ${unit}`;
}

function mergeScorecards(rows: Kpi[], executive: Kpi[]) {
  const merged = new Map<string, Kpi>();
  for (const row of [...executive, ...rows]) {
    const key = `${row.cargo_name}|${row.domain || ''}|${row.kpi_key}`;
    if (!merged.has(key)) merged.set(key, row);
  }
  return Array.from(merged.values());
}

const domainLabel: Record<string, string> = {
  production: 'Producción', mine: 'Mina', maintenance: 'Mantención', hse: 'HSE', risk: 'Riesgo', data_quality: 'Calidad de datos',
  inventory: 'Bodega', geology: 'Geología', drilling: 'Sondajes', procurement: 'Compras', finance: 'Finanzas', contracts: 'Contratos', documents: 'Documentos',
};

export default function DesempenoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selection, setSelection] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPayload(null);
    const query = selection === 'TODOS' ? '' : selection.startsWith('PROFILE:') ? `?profileId=${encodeURIComponent(selection.slice(8))}` : `?cargo=${encodeURIComponent(selection)}`;
    fetch(`/api/desempeno/scorecards${query}`, { signal: controller.signal, credentials: 'include' })
      .then(async (response) => { if (!response.ok) throw new Error((await response.json()).error || 'No fue posible cargar desempeño'); return response.json(); })
      .then((data) => { setPayload(data); setError(''); })
      .catch((err) => { if (err.name !== 'AbortError') { setPayload(null); setError(err.message); } })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selection]);

  const rows = useMemo(() => !payload ? [] : mergeScorecards(payload.rows, payload.executive), [payload]);
  const domains = new Set(rows.map((row) => row.domain).filter(Boolean)).size;
  const cargosVisible = new Set(rows.map((row) => row.cargo_name).filter(Boolean)).size;
  const withData = rows.filter((row) => row.measured_value !== null).length;
  const withoutTargets = rows.filter((row) => row.target_value === null || row.target_value === undefined).length;
  const person = payload?.person || null;
  const initiatives = person?.initiatives || [];
  const unavailable = Boolean(error) && !payload;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gestión</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Desempeño</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">KPIs operacionales trazables por cargo y dominio. No es una evaluación personal.</p></div>
      <Select value={selection} onValueChange={setSelection}><SelectTrigger className="w-full md:w-[340px]"><SelectValue placeholder="Seleccionar cargo o persona" /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos los cargos medidos</SelectItem>{(payload?.profiles || []).map((profile) => <SelectItem key={profile.id} value={`PROFILE:${profile.id}`}>{profile.full_name || 'Sin nombre'} · {profile.cargo_name || profile.role || 'Sin cargo'}</SelectItem>)}<SelectItem value="GERENTE">GERENTE · ejecutivo</SelectItem><SelectItem value="SUBGERENTE OP.">SUBGERENTE OP. · ejecutivo</SelectItem><SelectItem value="PRESIDENTE">PRESIDENTE · ejecutivo</SelectItem>{(payload?.cargos || []).filter((item) => !['GERENTE','SUBGERENTE OP.','PRESIDENTE'].includes(item)).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    </div>

    {error ? <Card><CardContent className="pt-5 text-sm text-destructive">{error}. Los KPI de la selección anterior no se conservan como si siguieran vigentes.</CardContent></Card> : null}

    {person ? <section className="border-y py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{person.fullName}</p></div><p className="mt-1 text-sm text-muted-foreground">{person.cargoName || person.role || 'Sin cargo definido'} · Vista ejecutiva global</p></div>
        <div className="flex flex-wrap gap-2"><Badge variant="outline">Todos los KPI</Badge><Badge variant="neutral">No evaluación personal</Badge></div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{person.fullName || 'La persona seleccionada'} ve los KPIs disponibles según su vista de gestión. El cargo de origen se mantiene visible en cada indicador para conservar trazabilidad.</p>
    </section> : null}

    <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Indicadores</p><p className="mt-1 text-2xl font-semibold">{loading || unavailable ? '—' : rows.length}</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Con evidencia</p><p className="mt-1 text-2xl font-semibold">{loading || unavailable ? '—' : withData}</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Dominios</p><p className="mt-1 text-2xl font-semibold">{loading || unavailable ? '—' : domains || '—'}</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Sin meta aprobada</p><p className="mt-1 text-2xl font-semibold">{loading || unavailable ? '—' : withoutTargets}</p></div>
    </div>

    <Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle>{person ? 'KPIs globales' : 'Scorecard'}</CardTitle><Badge variant="outline">Baseline</Badge><Badge variant="neutral">No evaluación personal</Badge></div><CardDescription>{payload?.meta.note || (unavailable ? 'Fuente no disponible para la selección actual.' : 'Cargando evidencia operacional…')}</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Cargo / dominio</TableHead><TableHead>Indicador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Dirección</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Cargando scorecard…</TableCell></TableRow> : unavailable ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No hay una lectura válida para esta selección mientras la fuente esté en error.</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No existen indicadores medidos para esta selección.</TableCell></TableRow> : rows.map((row,index) => <TableRow key={`${row.cargo_name}-${row.domain || 'general'}-${row.kpi_key}-${index}`}><TableCell><div className="font-medium">{row.cargo_name}</div>{row.domain ? <div className="text-xs text-muted-foreground">{domainLabel[row.domain] || row.domain}</div> : null}</TableCell><TableCell>{row.label}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatValue(row.measured_value,row.unit)}</TableCell><TableCell className="text-xs text-muted-foreground">{row.direction === 'higher_is_better' ? 'Mayor es mejor' : row.direction === 'lower_is_better' ? 'Menor es mejor' : 'Informativo'}</TableCell><TableCell><Badge variant="outline">{row.evaluation_state === 'baseline' ? 'Baseline' : row.evaluation_state}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

    {person ? <Card><CardHeader><div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-muted-foreground" /><CardTitle>Proyectos y mejora continua</CardTitle></div><CardDescription>Esta sección sí muestra sólo iniciativas atribuidas directamente a {person.fullName}; los KPIs superiores permanecen globales.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Iniciativa</TableHead><TableHead>PDCA</TableHead><TableHead>Estado</TableHead><TableHead>Fecha objetivo</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader><TableBody>{initiatives.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Aún no existen iniciativas Kaizen atribuidas directamente a esta persona.</TableCell></TableRow> : initiatives.map((item) => <TableRow key={item.id}><TableCell><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.kaizen_number || item.category || 'Kaizen'}</div></TableCell><TableCell>{item.pdca_stage || '—'}</TableCell><TableCell><Badge variant="outline">{item.status || 'Sin estado'}</Badge></TableCell><TableCell>{item.target_date || '—'}</TableCell><TableCell className="max-w-[420px] text-sm text-muted-foreground">{item.actual_result || item.expected_result || 'Sin resultado registrado'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card> : null}

    {(payload?.evidenceGaps?.length || 0) > 0 ? <Card><CardHeader><CardTitle>Brechas de evidencia</CardTitle><CardDescription>Áreas que todavía no deben convertirse en evaluación de desempeño.</CardDescription></CardHeader><CardContent className="space-y-3">{payload?.evidenceGaps?.map((gap) => <div key={gap.domain} className="flex gap-3 text-sm"><Badge variant="outline">{gap.domain}</Badge><span className="text-muted-foreground">{gap.detail}</span></div>)}</CardContent></Card> : null}
  </div>;
}
