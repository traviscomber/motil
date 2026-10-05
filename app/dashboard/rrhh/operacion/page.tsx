'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la habilitación para faena');
  return payload;
};

type ReadinessRow = {
  person_id: string;
  full_name: string;
  rut: string | null;
  role_title: string | null;
  assignment: { site_name?: string | null; shift_pattern?: string | null } | null;
  evidence: {
    credential_count: number;
    valid_competency_count: number;
    competency_count: number;
    active_epp_count: number;
  };
  readiness: {
    status: 'ready' | 'conditional' | 'blocked';
    label: 'APTO' | 'CONDICIONAL' | 'BLOQUEADO';
    reasons: string[];
    warnings: string[];
  };
};

function metric(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('es-CL').format(value);
}

function statusVariant(status: ReadinessRow['readiness']['status']) {
  if (status === 'blocked') return 'destructive' as const;
  if (status === 'ready') return 'secondary' as const;
  return 'outline' as const;
}

export default function RrhhOperationalPeoplePage() {
  const [query, setQuery] = useState('');
  const { data, error, isLoading } = useSWR('/api/rrhh/readiness', fetcher, { revalidateOnFocus: false });
  const rows: ReadinessRow[] = Array.isArray(data?.people) ? data.people : [];

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) =>
      [row.full_name, row.rut, row.role_title, row.assignment?.site_name, row.assignment?.shift_pattern]
        .some((field) => String(field || '').toLowerCase().includes(value))
    );
  }, [query, rows]);

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>RRHH · Operación</PageHeaderEyebrow>
          <PageHeaderTitle>Habilitación para faena</PageHeaderTitle>
          <PageHeaderDescription>
            Estado derivado desde identidad laboral, asignación vigente, credenciales, competencias y EPP. MOTIL no declara una persona apta sin requisitos explícitos de la faena.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          ['Personas', data?.summary?.total],
          ['Aptas', data?.summary?.ready],
          ['Condicionales', data?.summary?.conditional],
          ['Bloqueadas', data?.summary?.blocked],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{isLoading || error ? '—' : metric(value as number | null)}</p>
          </div>
        ))}
      </div>

      {!isLoading && !error && data?.policy?.configured === false ? (
        <StatePanel
          tone="neutral"
          title="Política de habilitación pendiente"
          description={data.policy.statement + ' Las brechas de evidencia se muestran como CONDICIONAL, no como cumplimiento supuesto.'}
        />
      ) : null}

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar persona, cargo, faena o turno" className="pl-9" />
      </div>

      {isLoading ? <StatePanel tone="loading" title="Calculando habilitación" description="Reuniendo evidencia laboral y operacional." /> : null}
      {error ? <StatePanel tone="error" title="No se pudo calcular la habilitación" description={error.message} /> : null}
      {!isLoading && !error && filtered.length === 0 ? <StatePanel tone="neutral" title="Sin resultados" description="No hay personas que coincidan con la búsqueda." /> : null}

      {!isLoading && !error && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[1.35fr_1fr_1.25fr_150px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Persona</span><span>Faena / turno</span><span>Evidencia</span><span>Estado</span>
          </div>
          {filtered.map((row) => (
            <Link key={row.person_id} href={'/dashboard/rrhh/personas/' + row.person_id} className="grid gap-3 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/40 lg:grid-cols-[1.35fr_1fr_1.25fr_150px] lg:items-center lg:gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.full_name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{row.role_title || 'Cargo no informado'}{row.rut ? ' · ' + row.rut : ''}</p>
              </div>
              <div className="text-sm">
                <p>{row.assignment?.site_name || 'Sin faena asignada'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.assignment?.shift_pattern || 'Turno no informado'}</p>
              </div>
              <div className="text-xs leading-5 text-muted-foreground">
                <p>{row.evidence.credential_count} cred. · {row.evidence.valid_competency_count}/{row.evidence.competency_count} comp. · {row.evidence.active_epp_count} EPP</p>
                <p className="truncate">{row.readiness.reasons[0] || row.readiness.warnings[0] || 'Evidencia en línea'}</p>
              </div>
              <div><Badge variant={statusVariant(row.readiness.status)}>{row.readiness.label}</Badge></div>
            </Link>
          ))}
        </div>
      ) : null}

      {!isLoading && !error && data?.summary?.without_assignment > 0 ? (
        <StatePanel
          tone="neutral"
          title="Asignaciones pendientes"
          description={String(data.summary.without_assignment) + ' persona(s) todavía no tienen una asignación laboral vigente a faena. Esta brecha se mantiene visible; no se rellena automáticamente.'}
        />
      ) : null}
    </div>
  );
}
