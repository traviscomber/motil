'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, FileText, Scale, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Legal');
  return payload;
};

export default function LegalPage() {
  const { data: casesData, error: casesError, mutate: mutateCases } = useSWR('/api/legal/cases', fetcher, { revalidateOnFocus: false });
  const { data: complianceData, error: complianceError, mutate: mutateCompliance } = useSWR('/api/legal/compliance', fetcher, { revalidateOnFocus: false });
  const { data: regulatoryData, error: regulatoryError, mutate: mutateRegulatory } = useSWR('/api/legal/sernageomin', fetcher, { revalidateOnFocus: false });

  const hasError = casesError || complianceError || regulatoryError;
  const caseSummary = casesData?.summary;
  const compliance = complianceData?.summary;
  const regulatorySummary = regulatoryData?.summary;

  const nextCases = Array.isArray(casesData?.cases) ? casesData.cases.slice(0, 5) : [];

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Control legal</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Casos, decisiones, plazos y evidencia conectados con la operación. Legal coordina el riesgo jurídico; las áreas operativas conservan la ejecución.
        </p>
      </header>

      {hasError ? (
        <StatePanel
          tone="error"
          title="Parte del control Legal no pudo actualizarse"
          description="Los datos faltantes no se sustituyen por cero ni por estados inferidos."
          actions={<Button variant="outline" size="sm" onClick={() => { void mutateCases(); void mutateCompliance(); void mutateRegulatory(); }}>Reintentar</Button>}
          className="min-h-0"
        />
      ) : null}

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-4">
        {[
          ['Casos activos', caseSummary?.total ?? '—'],
          ['Alta / crítica', caseSummary ? caseSummary.high + caseSummary.critical : '—'],
          ['Contratos por revisar', compliance?.contracts_pending_review ?? '—'],
          ['Señales regulatorias', regulatorySummary?.withMatchedEvidence ?? '—'],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Qué requiere atención</h2>
            <p className="text-sm text-muted-foreground">Prioridad derivada de las fuentes operacionales disponibles.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/legal/casos">Ver casos <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>

        <div className="divide-y overflow-hidden rounded-md border">
          {nextCases.length ? nextCases.map((item: any) => (
            <Link key={item.id} href={item.href} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.nextAction}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{item.owner}</span>
            </Link>
          )) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">No hay casos activos derivados de las fuentes actuales.</p>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Link href="/dashboard/legal/sernageomin" className="rounded-md border p-4 transition-colors hover:bg-muted/30">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Control regulatorio</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Obligaciones, autoridades, responsables, evidencia y escalamiento a Legal.</p>
        </Link>
        <Link href="/dashboard/legal/contratos" className="rounded-md border p-4 transition-colors hover:bg-muted/30">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Contratos</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Revisión, vigencia, responsables, garantías y respaldo contractual.</p>
        </Link>
        <Link href="/dashboard/legal/documentos" className="rounded-md border p-4 transition-colors hover:bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Documentos</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Expediente, versiones y evidencia documental del trabajo Legal.</p>
        </Link>
      </section>

      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-semibold">Flujo Legal</p>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-5">
          <p><span className="font-medium text-foreground">1. Señal</span><br />Un módulo detecta un hecho.</p>
          <p><span className="font-medium text-foreground">2. Caso</span><br />Se identifica riesgo o decisión.</p>
          <p><span className="font-medium text-foreground">3. Acción</span><br />Se asigna dueño operativo.</p>
          <p><span className="font-medium text-foreground">4. Evidencia</span><br />El área entrega respaldo.</p>
          <p><span className="font-medium text-foreground">5. Cierre</span><br />Legal revisa y deja trazabilidad.</p>
        </div>
      </section>
    </div>
  );
}
