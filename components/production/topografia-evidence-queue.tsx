'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ClipboardCopy, FileWarning, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { filterTopographyEvidence, gapLabel, topographyEvidenceRequest } from '@/lib/production/topography-evidence-queue.mjs';

type GapRow = {
  drill_hole_id:string; hole_code:string; source_gap_class:string;
  orientation_state:string|null; recovery_priority:number|null;
  required_source_action:string; audit_scope:string|null;
  source_rows_count:number|null; source_report_count:number|null;
};
type GapResponse = {
  total:number|null; loaded:number; sourceRowsRead:number;
  duplicateIdentifiers:number; invalidIdentifiers:number; complete:boolean;
  byClass:Record<string,number>; rows:GapRow[];
  provenance:string; isLiveMeasurement:false;
};

const PAGE_SIZE = 10;
async function fetchEvidence(url:string):Promise<GapResponse> {
  const response = await fetch(url, { credentials:'include', cache:'no-store' });
  const body = await response.json().catch(()=>null);
  if(!response.ok) throw new Error(body?.error || 'No fue posible obtener los registros de auditoría.');
  return body;
}

export function TopographyEvidenceQueue() {
  const { data, error, isLoading, mutate } = useSWR<GapResponse>(
    '/api/produccion/topografia/brechas', fetchEvidence, { revalidateOnFocus:false },
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState<string|null>(null);
  const [copyError, setCopyError] = useState<string|null>(null);
  const rows = useMemo<GapRow[]>(()=>
    filterTopographyEvidence(data?.rows || [], query, category) as GapRow[],
    [data?.rows, query, category],
  );
  const maxPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE)-1);
  const currentPage = Math.min(page,maxPage);
  const visible = rows.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  const categories = Object.entries(data?.byClass || {}).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
  const totalText = data?.total == null ? 'Total no verificable' :
    data.complete ? String(data.total) + ' sondajes con evidencia por recuperar'
      : String(data.loaded) + ' de ' + data.total + ' registros revisados (cobertura parcial)';
  const sourceWarning = Boolean(data && !data.complete);

  async function copyRequest(item:GapRow) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(topographyEvidenceRequest(item));
      setCopied(item.drill_hole_id);
    } catch {
      setCopyError('No se pudo copiar. Selecciona y comparte la acción requerida de la ficha.');
    }
  }

  return <section aria-label="Brechas documentales de Topografía" className="overflow-hidden rounded-lg border bg-card">
    <div className="border-b px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><FileWarning className="h-4 w-4"/> Evidencia por recuperar</p>
          <h2 className="mt-1 text-lg font-semibold">Brechas documentales de Topografía</h2>
          <p className="mt-1 text-sm text-muted-foreground">Por sondaje y prioridad registrada. No son OT ni mediciones ejecutadas. El estado corresponde a la auditoría documental indicada en cada ficha.</p>
        </div>
        <Button variant="outline" size="sm" onClick={()=>void mutate()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4"/>Actualizar consulta
        </Button>
      </div>
      <p className="mt-3 text-sm font-medium tabular-nums" aria-live="polite">{isLoading?'Consultando fuentes…':data?totalText:'—'}</p>
    </div>
    {error ? <div className="p-4"><StatePanel tone="error" title="No se pudo verificar la evidencia" description={error.message || 'Revisa la conexión y vuelve a intentar.'} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/></div> : null}
    {sourceWarning ? <div className="p-4"><StatePanel tone="warning" title="Cobertura incompleta o identificadores repetidos" description={'Fuente: '+(data?.total ?? 'total no verificable')+' registros, '+(data?.loaded ?? 0)+' sondajes distintos. Duplicados: '+(data?.duplicateIdentifiers ?? 0)+'; sin identificador: '+(data?.invalidIdentifiers ?? 0)+'. Los subtotales corresponden solo a la muestra.'} className="min-h-0 py-5"/></div> : null}
    {data && data.rows.length===0 && !error ? <div className="p-4"><StatePanel title="Sin brechas de origen registradas" description="La ausencia de brechas en esta auditoría no acredita que el levantamiento topográfico esté completo." className="min-h-0 py-5"/></div> : null}
    {data && data.rows.length>0 ? <>
      <div className="grid gap-3 border-b px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(210px,300px)] sm:px-5">
        <label className="block text-xs font-medium text-muted-foreground">
          Buscar por sondaje
          <input type="search" value={query} placeholder="Código del sondaje"
            onChange={event=>{setQuery(event.target.value);setPage(0);}}
            className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Tipo de brecha
          <select value={category} onChange={event=>{setCategory(event.target.value);setPage(0);}}
            className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">Todas las brechas ({data.loaded})</option>
            {categories.map(([code,count])=><option key={code} value={code}>{gapLabel(code)} ({count}{data.complete?'':' en muestra'})</option>)}
          </select>
        </label>
      </div>
      <div className="divide-y">
        {visible.length===0?<p className="px-5 py-7 text-sm text-muted-foreground">Sin sondajes que coincidan con los filtros.</p>:visible.map(item=>
          <details key={item.drill_hole_id} className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="font-medium">{item.hole_code}</p>
                <p className="mt-1 text-xs text-muted-foreground">{gapLabel(item.source_gap_class)}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Prioridad fuente {item.recovery_priority ?? '—'}</span>
                <span className="rounded-md border px-2 py-1 group-open:bg-muted">Ver evidencia</span>
              </div>
            </summary>
            <div className="space-y-3 border-t bg-muted/10 px-4 py-4 text-sm sm:px-5">
              <div><p className="text-xs font-medium text-muted-foreground">Acción de recuperación indicada en la fuente</p><p className="mt-1 leading-6">{item.required_source_action}</p></div>
              <div><p className="text-xs font-medium text-muted-foreground">Auditoría de origen</p><p className="mt-1 break-words text-muted-foreground">{item.audit_scope || 'Sin referencia de auditoría'}</p></div>
              <p className="text-xs text-muted-foreground">Reportes asociados: {item.source_report_count ?? 'sin dato'} · Filas fuente: {item.source_rows_count ?? 'sin dato'}. Los reportes no acreditan por sí solos la medición faltante.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="outline" onClick={()=>void copyRequest(item)}><ClipboardCopy className="mr-2 h-4 w-4"/>Copiar requerimiento</Button>
                {copied===item.drill_hole_id?<span role="status" className="text-xs text-muted-foreground">Texto copiado</span>:null}
              </div>
            </div>
          </details>
        )}
      </div>
      {copyError?<p role="alert" className="border-t px-4 py-3 text-sm text-destructive">{copyError}</p>:null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <span>Mostrando {rows.length ? currentPage*PAGE_SIZE+1 : 0}–{Math.min((currentPage+1)*PAGE_SIZE,rows.length)} de {rows.length}{data.complete?' registros filtrados':' casos cargados (parcial)'}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={currentPage===0} onClick={()=>setPage(current=>Math.max(0,current-1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={currentPage>=maxPage} onClick={()=>setPage(current=>Math.min(maxPage,current+1))}>Siguiente</Button>
        </div>
      </div>
    </>:null}
  </section>;
}
