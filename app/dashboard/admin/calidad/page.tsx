'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el quality gate');
  return payload;
};

export default function MotilQualityPage() {
  const { data, error, isLoading } = useSWR('/api/quality/modules', fetcher, { revalidateOnFocus: false });
  const modules = Array.isArray(data?.modules) ? data.modules : [];

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>MOTIL · Release governance</PageHeaderEyebrow>
          <PageHeaderTitle>Quality Gate 9,7</PageHeaderTitle>
          <PageHeaderDescription>Un módulo sólo obtiene 9,7 cuando pasan fuente canónica, operación real, integración, auditoría y frescura.</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {isLoading ? <StatePanel tone="loading" title="Auditando módulos" description="Consultando evidencia canónica y operacional." /> : null}
      {error ? <StatePanel tone="error" title="No se pudo ejecutar el quality gate" description={error.message} /> : null}

      {!isLoading && !error ? (
        <>
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
            <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Meta</p><p className="mt-1 text-xl font-semibold">9,7</p></div>
            <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Certificados</p><p className="mt-1 text-xl font-semibold">{data.certified}/{data.total}</p></div>
            <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Regla</p><p className="mt-1 text-sm font-medium">Todos los gates en PASS</p></div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            {modules.map((module: any) => (
              <Link key={module.key} href={module.href} className="block border-b px-4 py-4 last:border-b-0 hover:bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{module.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{module.blockers.length ? 'Bloquea: ' + module.blockers.join(', ') : 'Sin bloqueos duros.'}</p>
                  </div>
                  <Badge variant={module.certified ? 'secondary' : module.score >= 8.5 ? 'outline' : 'destructive'}>
                    {module.score.toFixed(1)} / 10
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  {module.gates.map((gate: any) => (
                    <div key={gate.key} className="rounded-md border px-3 py-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{gate.label}</span><span className="text-[10px] uppercase text-muted-foreground">{gate.status}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">{gate.detail}</p>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <StatePanel tone="neutral" title="La nota no se maquilla" description={data.statement} />
        </>
      ) : null}
    </div>
  );
}
