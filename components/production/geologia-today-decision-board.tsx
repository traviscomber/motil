'use client';

import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { SecondaryDetails } from '@/components/ui/secondary-details';
import { AlertTriangle, ArrowRight, Beaker, CheckCircle2, Compass, Drill, FileSearch, MapPinned, ShieldCheck } from 'lucide-react';

type Summary = {
  holes:number;
  locatedHoles:number;
  orientedHoles:number;
  purposeHoles:number;
  intervals:number;
  operationalIntervals:number;
  formalLoggingIntervals:number;
  unclassifiedIntervals:number;
  samples:number;
  samplesValidated:number;
  samplesReview:number;
  unresolvedLocations:number;
};
type PendingRow = {
  hole_code:string;
  resolution_state:string|null;
  review_priority:number|null;
  recommended_action:string|null;
  proposed_mine_name:string|null;
  proposed_sector_name:string|null;
  operational_bucket?:string|null;
  operational_priority?:number|null;
};
type CurrentHole = { id:string; start_at:string|null; mine_source_id:string|null; mine_sector_id:string|null; drilled_depth_m:number|null; };
type SupplementalData = { holes:CurrentHole[] };
type Props = { summary:Summary; pending:PendingRow[]; chemistryLinkedToHole:number; onOpenHoles:()=>void; onOpenResults:()=>void; onOpenPending:()=>void; };

const supplementalFetcher=async(url:string):Promise<SupplementalData>=>{const response=await fetch(url,{credentials:'include'});const data=await response.json();if(!response.ok)throw new Error(data.error||'No fue posible cargar evidencia vigente');return data;};
function pct(done:number,total:number){return total>0?Math.round((done/total)*100):0;}
function formatDate(value:string|null){if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('es-CL',{year:'numeric',month:'short',day:'2-digit'}).format(date);}
function Signal({label,value,detail,tone='neutral'}:{label:string;value:string;detail:string;tone?:'neutral'|'warn'|'ok'}){const toneClass=tone==='warn'?'text-amber-700 dark:text-amber-400':tone==='ok'?'text-emerald-700 dark:text-emerald-400':'text-foreground';return <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;}

export function GeologiaTodayDecisionBoard({summary:s,pending,chemistryLinkedToHole,onOpenHoles,onOpenResults,onOpenPending}:Props){
  const {data:supplemental}=useSWR('/api/produccion/geologia',supplementalFetcher);
  const currentYear=new Date().getFullYear();
  const currentHoles=(supplemental?.holes||[]).filter((hole)=>hole.start_at&&new Date(hole.start_at).getFullYear()===currentYear);
  const currentWithMine=currentHoles.filter((hole)=>Boolean(hole.mine_source_id)).length;
  const currentWithSector=currentHoles.filter((hole)=>Boolean(hole.mine_sector_id)).length;
  const currentWithDepth=currentHoles.filter((hole)=>hole.drilled_depth_m!=null).length;
  const latestCurrentStart=[...currentHoles].sort((a,b)=>String(b.start_at||'').localeCompare(String(a.start_at||'')))[0]?.start_at||null;

  const locatedPct=pct(s.locatedHoles,s.holes);
  const orientedPct=pct(s.orientedHoles,s.holes);
  const purposePct=pct(s.purposeHoles,s.holes);
  const unresolvedPending=pending.filter((row)=>!['resolved','verified','matched'].includes(String(row.resolution_state||'').toLowerCase()));
  const operationalPending=unresolvedPending.filter((row)=>String(row.operational_bucket||'').toLowerCase()!=='historico');
  const historicalPending=unresolvedPending.filter((row)=>String(row.operational_bucket||'').toLowerCase()==='historico');
  const topPending=[...operationalPending].sort((a,b)=>(b.operational_priority??-1)-(a.operational_priority??-1)||(b.review_priority||0)-(a.review_priority||0)).slice(0,3);
  const locationIsActionableException=s.holes>0&&locatedPct>=10&&locatedPct<100;

  const decisions=[
    ...(locationIsActionableException?[{
      title:'Revisar excepciones de ubicación',
      detail:`${s.holes-s.locatedHoles} de ${s.holes} sondajes quedan fuera de la cobertura de collar actualmente disponible.`,
      impact:'Se muestra porque existe cobertura suficiente para tratar estos casos como excepciones, no como una campaña masiva.',
      action:'Abrir mapa y sondajes',
      onClick:onOpenHoles,
      icon:MapPinned,
      active:true,
    }]:[]),
    {
      title:'Revisar evidencia química histórica',
      detail:`${s.samplesReview} registros químicos requieren revisión; ${s.samplesValidated} están validados.`,
      impact:`Sólo ${chemistryLinkedToHole} de ${s.samples} registros están ligados a un sondaje. Esa falta de vínculo limita interpretación local, pero no genera por sí sola una tarea de completitud.`,
      action:'Abrir resultados',
      onClick:onOpenResults,
      icon:Beaker,
      active:s.samplesReview>0,
    },
    {
      title:'Resolver reconciliaciones operacionales',
      detail:`${operationalPending.length} casos vigentes requieren atención; ${historicalPending.length} permanecen como backlog histórico separado.`,
      impact:'Estas sí son excepciones sobre evidencia existente y vigente: resolver mina, sector y pozo mejora trazabilidad sin pedir una fuente nueva.',
      action:'Abrir pendientes',
      onClick:onOpenPending,
      icon:AlertTriangle,
      active:operationalPending.length>0,
    },
  ].sort((a,b)=>Number(b.active)-Number(a.active));

  const spatialReading=s.holes===0
    ? 'No hay sondajes canónicos para evaluar cobertura espacial.'
    : locatedPct<10
      ? `La fuente canónica actual prácticamente no contiene collares georreferenciados (${s.locatedHoles}/${s.holes}). Se trata como límite de la fuente: no se solicita completarlos masivamente y la interpretación espacial permanece fuera de alcance.`
      : s.locatedHoles===s.holes
        ? 'Los collares disponibles permiten una lectura espacial completa del universo canónico de sondajes.'
        : `La lectura espacial es parcial con ${s.locatedHoles}/${s.holes} collares. Los faltantes son excepciones dentro de una dimensión que sí tiene cobertura suficiente.`;

  return <div className="space-y-5">
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Pendientes</h2>
        <Button onClick={onOpenPending}>Abrir tareas<ArrowRight className="h-4 w-4" /></Button>
      </div>
      <div className="divide-y rounded-lg border">
        {decisions.filter((item)=>item.active).map((item)=><button key={item.title} type="button" onClick={item.onClick} className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-medium">{item.title}</span><ArrowRight className="h-4 w-4 shrink-0" /></button>)}
        {!decisions.some((item)=>item.active)?<p className="p-4 text-sm text-muted-foreground">Sin acciones pendientes en la evidencia disponible.</p>:null}
      </div>
    </section>
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Por atender</h2></div><AlertTriangle className="h-4 w-4 text-muted-foreground"/></div>
        {topPending.length?<div className="mt-4 space-y-3">{topPending.map((row,index)=><div key={`${row.hole_code}-${index}`} className="border-t pt-3 first:border-t-0 first:pt-0"><div className="flex items-center justify-between gap-3"><p className="font-medium">{row.hole_code}</p><span className="text-xs text-muted-foreground">P{row.review_priority??'—'}</span></div><p className="mt-1 text-xs text-muted-foreground">{[row.proposed_mine_name,row.proposed_sector_name].filter(Boolean).join(' · ')||'Sin ubicación propuesta'}</p><p className="mt-2 text-sm">{row.recommended_action||'Revisar y reconciliar evidencia.'}</p></div>)}</div>:<div className="mt-5 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No hay pendientes operacionales priorizados abiertos.</div>}
        {topPending.length?<button type="button" onClick={onOpenPending} className="mt-4 inline-flex items-center gap-1 text-sm font-medium">Ver cola operacional <ArrowRight className="h-4 w-4"/></button>:null}
        {historicalPending.length>0?<p className="mt-4 border-t pt-3 text-xs leading-5 text-muted-foreground">{historicalPending.length.toLocaleString('es-CL')} casos históricos permanecen registrados para recuperación de evidencia y no alteran la prioridad diaria.</p>:null}
      </section>
    <SecondaryDetails>
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Ahora · {currentYear}</p><h2 className="mt-2 text-lg font-semibold tracking-tight">Evidencia vigente primero</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">La lectura operacional prioriza el año en curso antes del histórico. Estos indicadores usan únicamente sondajes canónicos con fecha de inicio {currentYear}.</p></div>
      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Sondajes iniciados</p><p className="mt-1 text-2xl font-semibold">{supplemental?currentHoles.length:'—'}</p><p className="mt-1 text-xs text-muted-foreground">Año {currentYear}</p></div>
        <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Ligados a mina</p><p className="mt-1 text-2xl font-semibold">{supplemental?`${currentWithMine}/${currentHoles.length}`:'—'}</p><p className="mt-1 text-xs text-muted-foreground">{supplemental?`${pct(currentWithMine,currentHoles.length)}% de cobertura canónica`:'Cargando'}</p></div>
        <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Ligados a sector</p><p className="mt-1 text-2xl font-semibold">{supplemental?`${currentWithSector}/${currentHoles.length}`:'—'}</p><p className="mt-1 text-xs text-muted-foreground">{supplemental?`${pct(currentWithSector,currentHoles.length)}% de cobertura canónica`:'Cargando'}</p></div>
        <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Profundidad disponible</p><p className="mt-1 text-2xl font-semibold">{supplemental?`${currentWithDepth}/${currentHoles.length}`:'—'}</p><p className="mt-1 text-xs text-muted-foreground">Último inicio {supplemental?formatDate(latestCurrentStart):'—'}</p></div>
      </div>
    </section>

    <section className="rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mesa de decisiones · Hoy</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Qué necesita atención geológica ahora</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Sólo aparecen acciones sobre evidencia existente o excepciones dentro de dimensiones con cobertura suficiente. La ausencia estructural de la fuente se informa, pero no se convierte en tarea. El backlog histórico se conserva separado y no compite con la operación actual.</p></div><ShieldCheck className="h-5 w-5 text-muted-foreground"/></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">{decisions.map((item)=>{const Icon=item.icon;return <button key={item.title} type="button" onClick={item.onClick} className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/20"><div className="flex items-start justify-between gap-3"><Icon className={`h-5 w-5 ${item.active?'text-amber-700 dark:text-amber-400':'text-emerald-700 dark:text-emerald-400'}`}/><ArrowRight className="h-4 w-4 text-muted-foreground"/></div><p className="mt-4 font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.impact}</p><p className="mt-4 text-xs font-medium">{item.action}</p></button>})}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cobertura de evidencia geológica">
      <Signal label="Collar georreferenciado" value={`${locatedPct}%`} detail={`${s.locatedHoles}/${s.holes} disponibles en fuente canónica`} tone={locatedPct===100?'ok':locatedPct>=10&&locatedPct<70?'warn':'neutral'}/>
      <Signal label="Orientación completa" value={`${orientedPct}%`} detail={`${s.orientedHoles}/${s.holes} con azimut + inclinación`} tone={orientedPct===100?'ok':orientedPct>=10&&orientedPct<70?'warn':'neutral'}/>
      <Signal label="Propósito geológico" value={`${purposePct}%`} detail={`${s.purposeHoles}/${s.holes} con objetivo documentado`} tone={purposePct===100?'ok':purposePct>=10&&purposePct<70?'warn':'neutral'}/>
      <Signal label="Química histórica" value={`${s.samplesValidated}`} detail={`${s.samplesValidated}/${s.samples} validados · ${chemistryLinkedToHole} ligados a sondaje`} />
    </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Lectura senior de la evidencia</p></div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex gap-3"><Compass className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Interpretación espacial</p><p className="mt-1 text-muted-foreground">{spatialReading}</p></div></div>
          <div className="flex gap-3"><Drill className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Capacidad de interpretación geológica</p><p className="mt-1 text-muted-foreground">{s.operationalIntervals>0?`Hay ${s.operationalIntervals} intervalos operacionales estructurados desde reportes de perforación. Sirven para leer señales fuente por profundidad, pero no equivalen a logging geológico formal. Logging formal explícitamente validado: ${s.formalLoggingIntervals}.`:'No hay evidencia intervalar operacional estructurada disponible. La interpretación debe permanecer limitada a las otras fuentes canónicas existentes.'}</p></div></div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Calidad de evidencia</p><p className="mt-1 text-muted-foreground">{s.samplesReview>0?`${s.samplesReview} registros químicos históricos tienen un estado de revisión abierto sobre evidencia ya existente.`:`No hay registros químicos históricos marcados para revisión. Esto valida su registro, no los convierte en ensayes de sondaje: ${chemistryLinkedToHole}/${s.samples} tienen vínculo explícito a pozo.`}</p></div></div>
        </div>
      </section>

    </SecondaryDetails>
  </div>;
}
