'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, FileCheck2, Leaf, ShieldCheck, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { SecondaryDetails } from '@/components/ui/secondary-details';

type OverviewResponse = {
  period: string;
  overview: {
    compliance_score: number;
    total_ncs: number;
    open_ncs: number;
    closed_ncs: number;
    overdue_cas: number;
    trend: 'mejorando' | 'empeorando' | 'stable';
  };
};

type ListResponse<T = unknown> = { data?: T[]; total?: number; items?: T[]; count?: number };

type AreaCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof ShieldCheck;
  facts: Array<{ label: string; value: number | null }>;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `No fue posible cargar ${url}`);
  return payload as T;
};

function exactCount(payload: ListResponse | unknown | undefined): number | null {
  if (payload === undefined || payload === null) return null;
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload === 'object') {
    const typed = payload as ListResponse;
    if (Array.isArray(typed.data)) return typed.data.length;
    if (Array.isArray(typed.items)) return typed.items.length;
    if (typeof typed.total === 'number') return typed.total;
    if (typeof typed.count === 'number') return typed.count;
  }
  return null;
}

const value = (count: number | null) => count === null ? '—' : count.toLocaleString('es-CL');

export default function SostenibilidadDashboard() {
  const { data: overviewData, error: overviewError, isLoading: overviewLoading, mutate: refreshOverview } = useSWR<OverviewResponse>('/api/sostenibilidad/dashboard/overview', fetcher, { refreshInterval: 60000 });
  const { data: documentosData } = useSWR<ListResponse>('/api/documents/list?module=prevenci%C3%B3n&category=documentos-hse', fetcher);
  const { data: capacitacionesData } = useSWR<ListResponse>('/api/sostenibilidad/capacitaciones', fetcher);
  const { data: eppData } = useSWR<ListResponse>('/api/sostenibilidad/epp', fetcher);
  const { data: inspeccionesInternasData } = useSWR<ListResponse>('/api/sostenibilidad/inspecciones', fetcher);
  const { data: inspeccionesExternasData } = useSWR<ListResponse>('/api/sostenibilidad/inspecciones?tipo=externas', fetcher);
  const { data: noConformidadesData } = useSWR<ListResponse>('/api/sostenibilidad/no-conformidades', fetcher);
  const { data: accionesCorrectivasData } = useSWR<ListResponse>('/api/sostenibilidad/corrective-actions', fetcher);
  const { data: medioAmbienteData } = useSWR<ListResponse>('/api/sostenibilidad/medio-ambiente', fetcher);
  const { data: comunidadesData } = useSWR<ListResponse>('/api/sostenibilidad/comunidades', fetcher);

  const overview = overviewData?.overview ?? null;
  const docCount = exactCount(documentosData);
  const capCount = exactCount(capacitacionesData);
  const eppCount = exactCount(eppData);
  const internalInspectionCount = exactCount(inspeccionesInternasData);
  const externalInspectionCount = exactCount(inspeccionesExternasData);
  const ncCount = exactCount(noConformidadesData);
  const correctiveActionCount = exactCount(accionesCorrectivasData);
  const environmentCount = exactCount(medioAmbienteData);
  const communityCount = exactCount(comunidadesData);

  const trend = overview?.trend === 'mejorando' ? 'Mejorando' : overview?.trend === 'empeorando' ? 'Empeorando' : overview ? 'Estable' : 'Sin fuente';
  const metrics = [
    { label: 'Cumplimiento', value: overview ? `${overview.compliance_score.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%` : '—', detail: trend },
    { label: 'NC abiertas', value: overview ? overview.open_ncs.toLocaleString('es-CL') : '—', detail: overview ? `${overview.total_ncs} registradas` : 'Sin resumen disponible' },
    { label: 'Acciones vencidas', value: overview ? overview.overdue_cas.toLocaleString('es-CL') : '—', detail: 'Sólo acciones con vencimiento acreditado' },
    { label: 'Inspecciones internas', value: value(internalInspectionCount), detail: 'Fuente específica' },
    { label: 'Inspecciones externas', value: value(externalInspectionCount), detail: 'Fuente específica' },
    { label: 'Documentos HSE', value: value(docCount), detail: 'Biblioteca HSE' },
  ];

  const areas: AreaCard[] = [
    {
      title: 'HSE / Prevención',
      description: 'Documentos, capacitación y EPP permanecen como fuentes distintas.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos',
      icon: ShieldCheck,
      facts: [
        { label: 'Documentos', value: docCount },
        { label: 'Capacitaciones', value: capCount },
        { label: 'EPP', value: eppCount },
      ],
    },
    {
      title: 'Inspecciones',
      description: 'Internas y externas se cuentan por separado; una no sustituye a la otra.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones',
      icon: FileCheck2,
      facts: [
        { label: 'Internas', value: internalInspectionCount },
        { label: 'Externas', value: externalInspectionCount },
      ],
    },
    {
      title: 'No conformidades',
      description: 'Registro y acciones correctivas sin convertir un porcentaje en un conteo.',
      href: '/dashboard/sostenibilidad/no-conformidades',
      icon: AlertTriangle,
      facts: [
        { label: 'Registros', value: ncCount },
        { label: 'Acciones correctivas', value: correctiveActionCount },
      ],
    },
    {
      title: 'Medio Ambiente',
      description: 'Sólo se muestra el total del registro ambiental disponible; no se inventan subtotales de permisos o monitoreos.',
      href: '/dashboard/sostenibilidad/medio-ambiente',
      icon: Leaf,
      facts: [{ label: 'Registros ambientales', value: environmentCount }],
    },
    {
      title: 'Comunidades',
      description: 'El total de la fuente no se reutiliza como partes interesadas, compromisos y licencia social.',
      href: '/dashboard/sostenibilidad/comunidades',
      icon: Users,
      facts: [{ label: 'Registros de comunidades', value: communityCount }],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Sostenibilidad</PageHeaderTitle>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild><Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones">Revisar inspecciones<ArrowRight className="h-4 w-4" /></Link></Button>
        </PageHeaderActions>
      </PageHeader>

      {overviewError ? <StatePanel tone="warning" title="Resumen HSE no disponible" description="Reintenta para revisar no conformidades y acciones vencidas." actions={<Button variant="outline" onClick={() => void refreshOverview()}>Reintentar</Button>} className="min-h-0 py-5"/> : null}

      <section aria-labelledby="sustainability-pending" className="space-y-3">
        <h2 id="sustainability-pending" className="text-base font-semibold">Pendientes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/sostenibilidad/no-conformidades" className="rounded-lg border p-4 hover:bg-muted/30">
            <p className="text-sm font-medium">No conformidades abiertas</p>
            <p className="mt-1 text-2xl font-semibold">{overviewLoading || overviewError ? '—' : overview?.open_ncs ?? '—'}</p>
          </Link>
          <Link href="/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas" className="rounded-lg border p-4 hover:bg-muted/30">
            <p className="text-sm font-medium">Acciones vencidas</p>
            <p className="mt-1 text-2xl font-semibold">{overviewLoading || overviewError ? '—' : overview?.overdue_cas ?? '—'}</p>
          </Link>
        </div>
      </section>

      <SecondaryDetails>
        <section aria-label="Estado de Sostenibilidad" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => <div key={metric.label} className="rounded-lg border px-4 py-3"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-1 text-xl font-semibold">{overviewError && ['Cumplimiento', 'NC abiertas', 'Acciones vencidas'].includes(metric.label) ? '—' : metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div>)}
        </section>
        <p className="text-xs text-muted-foreground">“—” indica una fuente no disponible.</p>
        <section className="space-y-3" aria-label="Fuentes de Sostenibilidad">
          {areas.map((area) => <div key={area.title} className="rounded-lg border p-4">
            <Link href={area.href} className="flex min-h-11 items-center justify-between gap-3 font-medium hover:underline">{area.title}<ArrowRight className="h-4 w-4" /></Link>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{area.facts.map((fact) => <p key={fact.label} className="text-sm">{fact.label}: <span className="font-medium">{value(fact.value)}</span></p>)}</div>
            <details className="mt-3 text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">Ver fuente</summary><p>{area.description}</p></details>
          </div>)}
        </section>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones/importar"><Upload className="h-4 w-4" />Importar inspecciones</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/sostenibilidad/reportes">Reportes</Link></Button>
        </div>
      </SecondaryDetails>
    </div>
  );
}
