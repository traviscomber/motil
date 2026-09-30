'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

type PropertyItem = {
  id: string;
  contract_number: string | null;
  title: string | null;
  contract_type: string | null;
  status: string | null;
  contract_value: number | null;
  currency: string | null;
  paid_amount: number | null;
  pending_amount: number;
  execution_percentage: number | null;
  responsible_area: string | null;
  responsible_person: string | null;
  end_date: string | null;
  review_due_date: string | null;
  contractor_name: string | null;
  property_name: string | null;
  project_name: string | null;
  royalty_rate: number | null;
  guarantee_amount: number | null;
  compliance_status: string | null;
  compliance_notes: string | null;
  has_evidence: boolean;
};

type Response = {
  data: PropertyItem[];
  summary: {
    total: number;
    with_property: number;
    with_royalty: number;
    review_due: number;
    missing_evidence: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar propiedad minera');
  return payload;
};

function money(value: number | null, currency: string | null) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MiningPropertyPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/legal/mining-property', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando propiedad minera" description="Leyendo contratos y obligaciones asociadas." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="Propiedad minera no disponible" description="No se reemplazan datos faltantes por supuestos." />;
  }

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · Propiedad minera</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Propiedad minera</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Contratos, arriendos, regalías, revisiones y respaldo documental asociados a propiedad minera.
        </p>
      </header>

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-5">
        {[
          ['Registros', data.summary.total],
          ['Con propiedad', data.summary.with_property],
          ['Con regalía', data.summary.with_royalty],
          ['Con revisión', data.summary.review_due],
          ['Sin evidencia', data.summary.missing_evidence],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="divide-y overflow-hidden rounded-md border">
        {data.data.length ? data.data.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.contract_type || 'Contrato'}</Badge>
                  <Badge variant="outline">{item.status || 'Sin estado'}</Badge>
                  {item.royalty_rate && item.royalty_rate > 0 ? (
                    <Badge variant="secondary">Regalía {item.royalty_rate}%</Badge>
                  ) : null}
                  {!item.has_evidence ? <Badge variant="destructive">Sin respaldo</Badge> : null}
                </div>
                <h2 className="mt-2 text-sm font-semibold">{item.property_name || item.title || item.contract_number || 'Propiedad sin nombre'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[item.contractor_name, item.project_name, item.responsible_area].filter(Boolean).join(' · ') || 'Sin contexto adicional registrado'}
                </p>
                {item.compliance_notes ? <p className="mt-2 text-sm">{item.compliance_notes}</p> : null}
              </div>

              <div className="shrink-0 text-xs text-muted-foreground md:text-right">
                <p>{item.review_due_date ? `Revisión: ${item.review_due_date}` : 'Sin fecha de revisión'}</p>
                <p className="mt-1">{item.end_date ? `Término: ${item.end_date}` : 'Sin fecha de término'}</p>
                <p className="mt-1">{item.responsible_person || 'Responsable no asignado'}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t pt-3 text-xs text-muted-foreground md:grid-cols-4">
              <p><span className="font-medium text-foreground">Valor</span><br />{money(item.contract_value, item.currency) || 'Sin monto'}</p>
              <p><span className="font-medium text-foreground">Pagado</span><br />{money(item.paid_amount, item.currency) || 'Sin pago registrado'}</p>
              <p><span className="font-medium text-foreground">Pendiente</span><br />{money(item.pending_amount, item.currency) || 'Sin monto pendiente'}</p>
              <p><span className="font-medium text-foreground">Avance</span><br />{item.execution_percentage !== null ? `${item.execution_percentage}%` : 'Sin avance registrado'}</p>
            </div>
          </article>
        )) : (
          <p className="p-4 text-sm text-muted-foreground">
            No hay contratos con propiedad minera o regalías registrados en la fuente canónica.
          </p>
        )}
      </section>
    </div>
  );
}
