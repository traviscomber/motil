'use client';

import useSWR from 'swr';
import { Map, Ruler, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type TopografiaData = {
  plan: null | { plan_code:string; period_start:string; period_end:string };
  planPeriod: { status:'current'|'expired'|'upcoming'|'missing'|'invalid'; evaluatedDate:string; canUseAsCurrent:boolean };
  summary: { canonicalSectors:number; planLines:number; plannedAdvanceM:number; plannedDrillingM:number; plannedTons:number; actualSurveyPoints:number|null; actualAdvanceM:number|null };
  lines: Array<{ id:string; line_type:string; mine_name_raw:string|null; sector_raw:string|null; level_raw:string|null; section_raw:string|null; planned_tons:number|null; planned_grade_pct:number|null; planned_advance_m:number|null; planned_drilling_m:number|null; priority:number|null; source_reference:string|null }>;
  intelligenceStatus: { surveyCanonical:boolean; coordinatesCanonical:boolean; actualAdvanceCanonical:boolean; note:string };
};

const fetcher=async(url:string):Promise<TopografiaData>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar Topografía');return d;};
const n=(v:number,d=0)=>v.toLocaleString('es-CL',{maximumFractionDigits:d});

function PlanMetric({label,value,detail}:{label:string;value:string;detail:string}){
 return <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

export function TopografiaDashboard(){
 const {data,error,isLoading,mutate}=useSWR('/api/produccion/topografia',fetcher);
 const s=data?.summary;
 const hasActualTopography=Boolean(data&&(data.intelligenceStatus.surveyCanonical||data.intelligenceStatus.coordinatesCanonical||data.intelligenceStatus.actualAdvanceCanonical));
 const currentPlan=data?.planPeriod.status === 'current';
 const referencePlan=Boolean(data?.plan && !currentPlan);
 const planStatusTitle=data?.planPeriod.status === 'expired' ? 'Plan vencido' : data?.planPeriod.status === 'upcoming' ? 'Plan aún no vigente' : 'Período del plan sin vigencia acreditada';
 const referenceKind=data?.planPeriod.status === 'expired' ? 'histórica' : data?.planPeriod.status === 'upcoming' ? 'futura' : 'con período no verificable';

 return <div className="space-y-6">
  <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Control espacial</PageHeaderEyebrow><PageHeaderTitle>Topografía</PageHeaderTitle><PageHeaderDescription>Plan espacial y evidencia topográfica real se mantienen separados. Un dato planificado nunca se presenta como levantamiento ejecutado.</PageHeaderDescription></PageHeaderContent></PageHeader>
  {error?<StatePanel tone="error" title="No fue posible cargar Topografía" description="Reintenta la consulta." actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/>:null}

  {referencePlan ? <StatePanel
    tone="warning"
    title={planStatusTitle}
    description={`El plan ${data?.plan?.plan_code} corresponde al período ${data?.plan?.period_start} a ${data?.plan?.period_end}. A fecha ${data?.planPeriod.evaluatedDate} sólo puede consultarse como referencia ${referenceKind}; no demuestra objetivos vigentes ni cumplimiento. Solicita un nuevo plan aprobado a Ingeniería.`}
    className="min-h-0 py-5"
  /> : null}

  <section className="overflow-hidden rounded-lg border" aria-label="Plan topográfico y período de referencia">
   <div className="border-b bg-card px-5 py-4"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{currentPlan ? 'Plan vigente' : data?.plan ? 'Plan de referencia · no vigente' : 'Sin plan vigente'}</p><p className="mt-1 font-medium">{data?.plan?.plan_code||'Sin plan activo identificado'}</p>{data?.plan ? <p className="mt-1 text-xs text-muted-foreground">Período: {data.plan.period_start} a {data.plan.period_end}</p> : null}<p className="mt-1 text-sm text-muted-foreground">{currentPlan ? 'Objetivos vigentes cargados desde planificación. No representan medición topográfica ejecutada.' : 'Objetivos no vigentes: no utilizarlos como metas actuales. Ningún dato del plan representa ejecución real.'}</p></div>
   <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
    <PlanMetric label="Sectores canónicos" value={isLoading?'—':s?n(s.canonicalSectors):'—'} detail="Maestro operacional"/>
    <PlanMetric label="Avance planificado" value={isLoading?'—':s?`${n(s.plannedAdvanceM)} m`:'—'} detail="Objetivo de avance"/>
    <PlanMetric label="Sondaje planificado" value={isLoading?'—':s?`${n(s.plannedDrillingM)} m`:'—'} detail={`${s?.planLines??0} líneas de plan`}/>
    <PlanMetric label="Toneladas planificadas" value={isLoading?'—':s?n(s.plannedTons,1):'—'} detail="Objetivo del plan"/>
   </div>
  </section>

  {data&&!hasActualTopography?<StatePanel title="Sin fuente topográfica canónica" description={data.intelligenceStatus.note} className="min-h-0 py-5"/>:null}

  {data&&hasActualTopography?<section className="rounded-lg border bg-card p-5" aria-label="Actual topográfico"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Actual topográfico</p><p className="mt-1 font-medium">Levantamiento canónico disponible</p><p className="mt-1 text-sm text-muted-foreground">Sólo se muestran valores provenientes de la fuente topográfica canónica.</p></div><Map className="h-5 w-5 text-muted-foreground"/></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Puntos de levantamiento</p><p className="mt-1 text-xl font-semibold tabular-nums">{s?.actualSurveyPoints==null?'—':n(s.actualSurveyPoints)}</p></div><div><p className="text-xs text-muted-foreground">Avance real</p><p className="mt-1 text-xl font-semibold tabular-nums">{s?.actualAdvanceM==null?'—':`${n(s.actualAdvanceM,1)} m`}</p></div></div></section>:null}

  {data?.plan?<section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">Plan de labores</p><p className="mt-1 text-sm text-muted-foreground">Detalle planificado. La futura reconciliación con avance, coordenadas y cotas reales ocurrirá sólo cuando exista evidencia topográfica canónica.</p></div><div className="flex gap-2 text-muted-foreground"><Ruler className="h-4 w-4"/><Target className="h-4 w-4"/></div></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Mina / sector</th><th className="px-4 py-3">Nivel / sección</th><th className="px-4 py-3 text-right">Toneladas</th><th className="px-4 py-3 text-right">Avance</th><th className="px-4 py-3 text-right">Perforación</th></tr></thead><tbody className="divide-y">{data.lines.map(l=><tr key={l.id}><td className="px-4 py-3">{l.line_type}</td><td className="px-4 py-3"><p>{l.mine_name_raw||'—'}</p><p className="text-xs text-muted-foreground">{l.sector_raw||'Sin sector'}</p></td><td className="px-4 py-3"><p>{l.level_raw||'—'}</p><p className="text-xs text-muted-foreground">{l.section_raw||'—'}</p></td><td className="px-4 py-3 text-right tabular-nums">{l.planned_tons==null?'—':n(Number(l.planned_tons),1)}</td><td className="px-4 py-3 text-right tabular-nums">{l.planned_advance_m==null?'—':`${n(Number(l.planned_advance_m),1)} m`}</td><td className="px-4 py-3 text-right tabular-nums">{l.planned_drilling_m==null?'—':`${n(Number(l.planned_drilling_m),1)} m`}</td></tr>)}</tbody></table></div></section>:data&&!isLoading?<StatePanel title="Sin plan topográfico activo" description="No hay un plan mensual activo para mostrar. Esto no se reemplaza por valores estimados." className="min-h-0 py-5"/>:null}
 </div>;
}
