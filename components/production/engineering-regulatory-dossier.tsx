'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

type LegalCase = { id:string; status:string; evidenceStatus:string };
type Requirement = {id:string;title:string;legalBasis:string[];businessOwner:string;nextAction:string;
 expectedEvidence:string[];sourceUrl:string;applicabilityNote:string;reviewCase:LegalCase|null};
type Dossier = {
 canSubmitLegalReview:boolean;
 requirements:Requirement[];
 summary:{requiredReviews:number;requestedReviews:number;technicalDocumentCount:number|null;technicalDocumentRows:number;technicalDocumentsComplete:boolean;historicalSourceCount:number|null;historicalSourceRows:number;historicalSourcesComplete:boolean};
 documents:Array<{id:string;name:string;module:string;version:number|null;status:string|null}>;
 historicalSources:Array<{id:string;file:string;kind:string;periodStart:string|null;periodEnd:string|null}>;
};
const stateLabel:Record<string,string>={new:'Nueva en Legal',in_review:'En revisión de Legal',action_required:'Legal solicitó acción',waiting_area:'Esperando antecedente',closed:'Cerrada en Legal; no acredita cumplimiento'};
async function fetcher(url:string):Promise<Dossier>{
 const response=await fetch(url,{credentials:'include',cache:'no-store'});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(body?.error||'Expediente no verificable');
 return body;
}
function coverage(total:number|null,loaded:number,complete:boolean){
 return total===null?loaded+' consultados · total no verificable':complete?String(total):loaded+' de '+total+' (muestra parcial)';
}
export function EngineeringRegulatoryDossier(){
 const {data,error,isLoading,mutate}=useSWR<Dossier>('/api/intelligence/engineering-evidence-dossier',fetcher,{revalidateOnFocus:false});
 const [submitting,setSubmitting]=useState<string|null>(null);
 const [message,setMessage]=useState<string|null>(null);
 const [errorMessage,setErrorMessage]=useState(false);
 async function submit(obligationId:string){
  if(submitting||!data?.canSubmitLegalReview)return;
  setSubmitting(obligationId);setMessage(null);setErrorMessage(false);
  try{
   const response=await fetch('/api/intelligence/engineering-evidence-dossier',{
    method:'POST',credentials:'include',headers:{'content-type':'application/json'},
    body:JSON.stringify({obligationId}),
   });
   const payload=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(payload?.error||'No se pudo solicitar la revisión');
   setMessage(payload?.created?'Solicitud registrada en Legal; aplicabilidad pendiente de revisión.':'La solicitud ya existe en Legal; no se duplicó.');
   await mutate();
  }catch(e){setErrorMessage(true);setMessage(e instanceof Error?e.message:'Error al solicitar revisión');}
  finally{setSubmitting(null);}
 }
 if(isLoading)return <StatePanel tone="loading" title="Consultando expediente" description="Verificando fuentes y solicitudes por organización." className="min-h-0 py-4"/>;
 if(error||!data)return <StatePanel tone="error" title="Expediente no verificable" description={error?.message||'No se obtuvieron fuentes completas'} actions={<Button variant="outline" size="sm" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-4"/>;
 return <section aria-label="Expediente normativo de Ingeniería" className="space-y-4">
  <div className="rounded-md border bg-muted/20 px-4 py-3">
   <p className="text-sm font-medium">Expediente técnico y derivación a Legal</p>
   <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
    <p>Documentos técnicos localizados: <strong className="text-foreground">{coverage(data.summary.technicalDocumentCount,data.summary.technicalDocumentRows,data.summary.technicalDocumentsComplete)}</strong></p>
    <p>Fuentes históricas: <strong className="text-foreground">{coverage(data.summary.historicalSourceCount,data.summary.historicalSourceRows,data.summary.historicalSourcesComplete)}</strong></p>
    <p>Solicitudes a Legal: <strong className="text-foreground">{data.summary.requestedReviews} de {data.summary.requiredReviews}</strong></p>
   </div>
   <p className="mt-2 text-xs text-muted-foreground">Inventario acotado. Puede haber documentos en otros repositorios. Ninguna fuente histórica prueba una autorización, nombramiento o plano normativo.</p>
  </div>
  {message?<p role={errorMessage?'alert':'status'} className={'rounded-md border px-3 py-2 text-sm '+(errorMessage?'text-destructive':'text-foreground')}>{message}</p>:null}
  <div className="grid gap-3 lg:grid-cols-2">
   {data.requirements.map(item=><article key={item.id} className="min-w-0 rounded-md border px-4 py-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
     <span>{item.legalBasis.join(' · ')}</span>
     <span>{item.reviewCase?stateLabel[item.reviewCase.status]||'Estado Legal pendiente de aclaración':'Sin solicitud a Legal'}</span>
    </div>
    <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
    <p className="mt-2 text-sm leading-relaxed">{item.nextAction}</p>
    <p className="mt-3 text-xs text-muted-foreground">Responsabilidad formal por confirmar: {item.businessOwner}</p>
    <details className="mt-3">
     <summary className="cursor-pointer text-xs font-medium">Antecedentes y aplicabilidad</summary>
     <p className="mt-2 text-xs text-muted-foreground">{item.applicabilityNote}</p>
     <p className="mt-2 text-xs text-muted-foreground">Respaldos a solicitar: {item.expectedEvidence.map(key=>key.replaceAll('_',' ')).join(' · ')}</p>
     <p className="mt-2 text-xs text-muted-foreground">No existe vinculación jurídica validada por este módulo.</p>
    </details>
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
     {data.canSubmitLegalReview&&!item.reviewCase?
       <Button size="sm" variant="outline" disabled={Boolean(submitting)} onClick={()=>void submit(item.id)}>{submitting===item.id?'Enviando…':'Solicitar revisión a Legal'}</Button>:
       <span className="text-xs text-muted-foreground">{item.reviewCase?'Caso gestionado en Legal; el cierre corresponde a esa área.':'Consulta de solo lectura'}</span>}
     <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">Fuente oficial</a>
    </div>
   </article>)}
  </div>
  <details className="rounded-md border px-4 py-3">
   <summary className="cursor-pointer text-sm font-medium">Inventario de archivos consultados</summary>
   <div className="mt-3 space-y-3 text-xs text-muted-foreground">
    <div><p className="font-medium text-foreground">Documentos técnicos</p>
     {data.documents.length?data.documents.map(d=><p key={d.id} className="mt-1">{d.name} · {d.module} · versión {d.version??'sin dato'} · sin revisión jurídica</p>):<p className="mt-1">Sin documentos de Ingeniería/Topografía/Producción en las fuentes consultadas.</p>}</div>
    <div><p className="font-medium text-foreground">Fuentes de planificación y perforación (contexto histórico, no respaldo regulatorio)</p>
     {data.historicalSources.length?data.historicalSources.map(d=><p key={d.id} className="mt-1">{d.file} · {d.kind} · {d.periodStart||'sin inicio'} a {d.periodEnd||'sin cierre'}</p>):<p className="mt-1">Sin fuentes operacionales en el inventario consultado.</p>}</div>
   </div>
  </details>
  <p className="text-xs text-muted-foreground">Ingeniería prepara antecedentes y Legal determina aplicabilidad, responsables y cierre. El envío no sustituye nombramientos, resoluciones ni firma profesional.</p>
 </section>;
}
