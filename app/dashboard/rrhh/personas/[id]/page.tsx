'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

type Payload = {
  person: {
    id: string;
    full_name: string;
    rut: string | null;
    email: string | null;
    phone: string | null;
    role_title: string | null;
    employment_status: string;
    profile_id: string | null;
    source_type: string;
  };
  assignments: any[];
  cases: any[];
  competencies: any[];
  credentials: any[];
  epp: any[];
  evaluations: any[];
  operatorActivity: any[];
  workOrders: any[];
};

function employmentLabel(status: string) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'active') return 'Activo';
  if (value === 'inactive') return 'Inactivo';
  if (value === 'suspended') return 'Suspendido';
  if (value === 'terminated') return 'Desvinculado';
  return status || 'Sin estado';
}

export default function PersonLaborRecordPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rrhh/people?person_id=${encodeURIComponent(params.id)}`, { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la ficha laboral');
        return payload;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la ficha laboral'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <StatePanel tone="loading" title="Cargando ficha" description="Reuniendo la información disponible de la persona." />;
  }
  if (error || !data) {
    return <StatePanel tone="error" title="No se pudo cargar la ficha" description={error || 'Persona no disponible.'} />;
  }

  const { person } = data;
  const hasOperationalData = data.workOrders.length > 0 || data.operatorActivity.length > 0;
  const hasRequirements = data.competencies.length > 0 || data.credentials.length > 0 || data.epp.length > 0;
  const hasHistory = data.cases.length > 0 || data.evaluations.length > 0;
  const currentAssignment = data.assignments.find((item) => !item.end_date) || data.assignments[0] || null;

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>RRHH · Persona</PageHeaderEyebrow>
          <PageHeaderTitle>{person.full_name}</PageHeaderTitle>
          <PageHeaderDescription>
            {person.role_title || 'Cargo pendiente'}
            {person.rut ? ` · ${person.rut}` : ''}
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/dashboard/rrhh"><ArrowLeft className="mr-2 h-4 w-4" />Personas</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          ['Estado', employmentLabel(person.employment_status)],
          ['Cargo', person.role_title || 'Pendiente'],
          ['Acceso', person.profile_id ? 'Vinculado' : 'Sin vincular'],
          ['Actividad', data.workOrders.length + data.operatorActivity.length],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="border-b pb-5">
        <h2 className="text-base font-semibold">Datos de la persona</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Correo</p><p>{person.email || 'No informado'}</p></div>
          <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{person.phone || 'No informado'}</p></div>
          <div><p className="text-xs text-muted-foreground">RUT</p><p>{person.rut || 'No informado'}</p></div>
          <div><p className="text-xs text-muted-foreground">Fuente</p><p>{person.source_type || 'No informada'}</p></div>
        </div>
      </section>

      <section className="border-b pb-5">
        <h2 className="text-base font-semibold">Asignación actual</h2>
        {currentAssignment ? (
          <div className="mt-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{currentAssignment.role_title || currentAssignment.area || person.role_title || 'Asignación'}</span>
              <Badge variant="outline">{currentAssignment.end_date ? 'Histórica' : 'Vigente'}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {[currentAssignment.site_name, currentAssignment.shift_pattern, currentAssignment.employment_type].filter(Boolean).join(' · ') || 'Sin detalle adicional'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Desde {currentAssignment.start_date || 'fecha no informada'}
              {currentAssignment.end_date ? ` hasta ${currentAssignment.end_date}` : ''}
            </p>
          </div>
        ) : (
          <StatePanel
            tone="neutral"
            title="Asignación pendiente"
            description="Todavía no existe una asignación laboral estructurada para esta persona."
          />
        )}
      </section>

      <section className="border-b pb-5">
        <h2 className="text-base font-semibold">Actividad operacional</h2>
        {!hasOperationalData ? (
          <p className="mt-2 text-sm text-muted-foreground">No hay actividad operacional vinculada todavía.</p>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Órdenes de trabajo</p>
              <div className="mt-2 divide-y border-y">
                {data.workOrders.slice(0, 8).map((wo) => (
                  <div key={wo.id} className="py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>{wo.work_order_number} · {wo.title}</span>
                      <span className="text-muted-foreground">{wo.status || '—'}</span>
                    </div>
                  </div>
                ))}
                {data.workOrders.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Sin OT vinculadas.</p> : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Operación</p>
              <div className="mt-2 divide-y border-y">
                {data.operatorActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>{activity.operation_date} · {activity.activity_type}</span>
                      <span className="text-muted-foreground">{activity.activity_status}</span>
                    </div>
                  </div>
                ))}
                {data.operatorActivity.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Sin actividad registrada.</p> : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {hasRequirements ? (
        <section className="border-b pb-5">
          <h2 className="text-base font-semibold">Requisitos y habilitación</h2>
          <div className="mt-3 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
            {[
              ['Competencias', data.competencies.length],
              ['Credenciales', data.credentials.length],
              ['EPP', data.epp.length],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasHistory ? (
        <section>
          <h2 className="text-base font-semibold">Historial laboral</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.cases.length} caso(s) · {data.evaluations.length} evaluación(es) registradas.
          </p>
        </section>
      ) : null}

      {!hasRequirements && !hasHistory ? (
        <StatePanel
          tone="neutral"
          title="Ficha inicial"
          description="La ficha muestra sólo información disponible. Competencias, credenciales, EPP e historial aparecerán cuando existan registros reales."
        />
      ) : null}
    </div>
  );
}
