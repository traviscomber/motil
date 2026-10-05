'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  person: { id: string; full_name: string; rut: string | null; email: string | null; phone: string | null; role_title: string | null; employment_status: string; profile_id: string | null; source_type: string };
  assignments: any[];
  cases: any[];
  competencies: any[];
  credentials: any[];
  epp: any[];
  evaluations: any[];
  operatorActivity: any[];
  workOrders: any[];
  readiness: { status: 'ready' | 'conditional' | 'blocked'; label: 'APTO' | 'CONDICIONAL' | 'BLOQUEADO'; reasons: string[]; warnings: string[]; policy_configured: boolean; evidence_complete: boolean };
};

export default function PersonLaborRecordPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [captureKind, setCaptureKind] = useState<'assignment' | 'credential' | 'competency' | 'epp'>('assignment');
  const [capture, setCapture] = useState({
    site_name: '',
    shift_pattern: '',
    role_title: '',
    area: '',
    employment_type: '',
    start_date: '',
    end_date: '',
    credential_type: '',
    credential_name: '',
    credential_number: '',
    issued_at: '',
    expires_at: '',
    competency_name: '',
    level: '',
    verified_at: '',
    epp_name: '',
    assigned_at: '',
    renewal_due_at: '',
  });
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

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
  }, [params.id, reloadKey]);

  const latestEvaluation = useMemo(() => data?.evaluations?.find((evaluation) => evaluation.status === 'finalized') || null, [data]);

  async function submitEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEvidence(true);
    setEvidenceMessage(null);
    setEvidenceError(null);

    const body: Record<string, string> = { kind: captureKind, person_id: params.id };
    if (captureKind === 'assignment') {
      Object.assign(body, {
        site_name: capture.site_name,
        shift_pattern: capture.shift_pattern,
        role_title: capture.role_title,
        area: capture.area,
        employment_type: capture.employment_type,
        start_date: capture.start_date,
        end_date: capture.end_date,
      });
    } else if (captureKind === 'credential') {
      Object.assign(body, {
        credential_type: capture.credential_type,
        credential_name: capture.credential_name,
        credential_number: capture.credential_number,
        issued_at: capture.issued_at,
        expires_at: capture.expires_at,
      });
    } else if (captureKind === 'competency') {
      Object.assign(body, {
        competency_name: capture.competency_name,
        level: capture.level,
        verified_at: capture.verified_at,
        expires_at: capture.expires_at,
      });
    } else {
      Object.assign(body, {
        epp_name: capture.epp_name,
        assigned_at: capture.assigned_at,
        renewal_due_at: capture.renewal_due_at,
      });
    }

    try {
      const response = await fetch('/api/rrhh/people/evidence', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar la evidencia');

      setEvidenceMessage('Evidencia registrada. La habilitación se recalculó con datos canónicos.');
      setCapture((current) => ({
        ...current,
        site_name: '',
        shift_pattern: '',
        role_title: '',
        area: '',
        employment_type: '',
        start_date: '',
        end_date: '',
        credential_type: '',
        credential_name: '',
        credential_number: '',
        issued_at: '',
        expires_at: '',
        competency_name: '',
        level: '',
        verified_at: '',
        epp_name: '',
        assigned_at: '',
        renewal_due_at: '',
      }));
      setReloadKey((value) => value + 1);
    } catch (err) {
      setEvidenceError(err instanceof Error ? err.message : 'No se pudo guardar la evidencia');
    } finally {
      setSavingEvidence(false);
    }
  }

  if (loading) return <StatePanel tone="loading" title="Cargando ficha laboral" description="Reuniendo evidencia desde RRHH y módulos operacionales." />;
  if (error || !data) return <StatePanel tone="error" title="No se pudo cargar la ficha laboral" description={error || 'Persona no disponible.'} />;

  const { person } = data;
  const evidenceCount = data.cases.length + data.competencies.length + data.credentials.length + data.epp.length + data.evaluations.length + data.operatorActivity.length + data.workOrders.length;

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>RRHH · Ficha Laboral 360°</PageHeaderEyebrow>
          <PageHeaderTitle>{person.full_name}</PageHeaderTitle>
          <PageHeaderDescription>{person.role_title || 'Cargo no informado'}{person.rut ? ` · ${person.rut}` : ''}</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline"><Link href="/dashboard/rrhh"><ArrowLeft className="mr-2 h-4 w-4" />Personas</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-5">
        {[
          ['Habilitación', data.readiness?.label || '—'],
          ['Score formal', latestEvaluation?.overall_score ?? '—'],
          ['OT', data.workOrders.length],
          ['Actividades', data.operatorActivity.length],
          ['Evidencias', evidenceCount],
        ].map(([label, value]) => <div key={label} className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
      </div>

      <section className="border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Habilitación para faena</h2>
            <p className="mt-1 text-sm text-muted-foreground">Estado derivado desde evidencia disponible; no reemplaza la validación formal de requisitos de faena.</p>
          </div>
          <Badge variant={data.readiness?.status === 'blocked' ? 'destructive' : data.readiness?.status === 'ready' ? 'secondary' : 'outline'}>
            {data.readiness?.label || 'SIN EVALUAR'}
          </Badge>
        </div>
        {data.readiness?.reasons?.length ? (
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            {data.readiness.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">Sin brechas registradas en la evaluación actual.</p>}
        {data.readiness?.warnings?.length ? (
          <div className="mt-3 space-y-1 text-sm">
            {data.readiness.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
          </div>
        ) : null}
      </section>


      <section className="border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Completar habilitación</h2>
            <p className="mt-1 text-sm text-muted-foreground">Registra evidencia estructurada. MOTIL recalcula el estado, pero no declara APTO mientras la política de la faena no esté configurada.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['assignment', 'Asignación'],
              ['credential', 'Credencial'],
              ['competency', 'Competencia'],
              ['epp', 'EPP'],
            ].map(([value, label]) => (
              <Button key={value} type="button" size="sm" variant={captureKind === value ? 'default' : 'outline'} onClick={() => setCaptureKind(value as typeof captureKind)}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={submitEvidence} className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-4">
          {captureKind === 'assignment' ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={capture.site_name} onChange={(event) => setCapture((current) => ({ ...current, site_name: event.target.value }))} placeholder="Faena" />
              <Input value={capture.shift_pattern} onChange={(event) => setCapture((current) => ({ ...current, shift_pattern: event.target.value }))} placeholder="Turno" />
              <Input value={capture.role_title} onChange={(event) => setCapture((current) => ({ ...current, role_title: event.target.value }))} placeholder="Cargo" />
              <Input value={capture.area} onChange={(event) => setCapture((current) => ({ ...current, area: event.target.value }))} placeholder="Área" />
              <Input value={capture.employment_type} onChange={(event) => setCapture((current) => ({ ...current, employment_type: event.target.value }))} placeholder="Tipo de relación" />
              <Input type="date" required value={capture.start_date} onChange={(event) => setCapture((current) => ({ ...current, start_date: event.target.value }))} aria-label="Fecha de inicio" />
              <Input type="date" value={capture.end_date} onChange={(event) => setCapture((current) => ({ ...current, end_date: event.target.value }))} aria-label="Fecha de término" />
            </div>
          ) : null}

          {captureKind === 'credential' ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input required value={capture.credential_type} onChange={(event) => setCapture((current) => ({ ...current, credential_type: event.target.value }))} placeholder="Tipo de credencial" />
              <Input required value={capture.credential_name} onChange={(event) => setCapture((current) => ({ ...current, credential_name: event.target.value }))} placeholder="Nombre de credencial" />
              <Input value={capture.credential_number} onChange={(event) => setCapture((current) => ({ ...current, credential_number: event.target.value }))} placeholder="Número / referencia" />
              <Input type="date" value={capture.issued_at} onChange={(event) => setCapture((current) => ({ ...current, issued_at: event.target.value }))} aria-label="Fecha de emisión" />
              <Input type="date" value={capture.expires_at} onChange={(event) => setCapture((current) => ({ ...current, expires_at: event.target.value }))} aria-label="Fecha de vencimiento" />
            </div>
          ) : null}

          {captureKind === 'competency' ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input required value={capture.competency_name} onChange={(event) => setCapture((current) => ({ ...current, competency_name: event.target.value }))} placeholder="Competencia" />
              <Input value={capture.level} onChange={(event) => setCapture((current) => ({ ...current, level: event.target.value }))} placeholder="Nivel" />
              <Input type="date" value={capture.verified_at} onChange={(event) => setCapture((current) => ({ ...current, verified_at: event.target.value }))} aria-label="Fecha de verificación" />
              <Input type="date" value={capture.expires_at} onChange={(event) => setCapture((current) => ({ ...current, expires_at: event.target.value }))} aria-label="Fecha de vencimiento" />
            </div>
          ) : null}

          {captureKind === 'epp' ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input required value={capture.epp_name} onChange={(event) => setCapture((current) => ({ ...current, epp_name: event.target.value }))} placeholder="Elemento EPP" />
              <Input type="date" required value={capture.assigned_at} onChange={(event) => setCapture((current) => ({ ...current, assigned_at: event.target.value }))} aria-label="Fecha de entrega" />
              <Input type="date" value={capture.renewal_due_at} onChange={(event) => setCapture((current) => ({ ...current, renewal_due_at: event.target.value }))} aria-label="Próxima renovación" />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={savingEvidence}>{savingEvidence ? 'Guardando…' : 'Registrar evidencia'}</Button>
            {evidenceMessage ? <p className="text-sm text-muted-foreground">{evidenceMessage}</p> : null}
            {evidenceError ? <p className="text-sm text-destructive">{evidenceError}</p> : null}
          </div>
        </form>
      </section>

      <section className="border-b pb-5">
        <h2 className="text-base font-semibold">Identidad laboral</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Correo</p><p>{person.email || 'No informado'}</p></div>
          <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{person.phone || 'No informado'}</p></div>
          <div><p className="text-xs text-muted-foreground">Usuario ERP</p><p>{person.profile_id ? 'Vinculado' : 'Sin vincular'}</p></div>
          <div><p className="text-xs text-muted-foreground">Fuente</p><p>{person.source_type}</p></div>
        </div>
      </section>

      <section className="border-b pb-5">
        <h2 className="text-base font-semibold">Asignaciones laborales</h2>
        {data.assignments.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Sin historial estructurado todavía.</p> : <div className="mt-2 divide-y">{data.assignments.map((item) => <div key={item.id} className="py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{item.role_title || item.area || 'Asignación'}</span><span className="text-muted-foreground">{item.start_date}{item.end_date ? ` → ${item.end_date}` : ' → vigente'}</span></div><p className="mt-1 text-muted-foreground">{[item.site_name, item.shift_pattern, item.employment_type].filter(Boolean).join(' · ') || 'Sin detalle adicional'}</p></div>)}</div>}
      </section>

      <section className="border-b pb-5">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Desempeño y trabajo</h2><Badge variant="outline">evidencia automática + evaluación</Badge></div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div><p className="text-sm font-medium">Órdenes de trabajo</p><div className="mt-2 divide-y border-y">{data.workOrders.slice(0, 12).map((wo) => <div key={wo.id} className="py-2 text-sm"><div className="flex justify-between gap-3"><span>{wo.work_order_number} · {wo.title}</span><span className="text-muted-foreground">{wo.status || '—'}</span></div></div>)}{data.workOrders.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Sin OT vinculadas por person_id.</p> : null}</div></div>
          <div><p className="text-sm font-medium">Actividad operacional</p><div className="mt-2 divide-y border-y">{data.operatorActivity.slice(0, 12).map((activity) => <div key={activity.id} className="py-2 text-sm"><div className="flex justify-between gap-3"><span>{activity.operation_date} · {activity.activity_type}</span><span className="text-muted-foreground">{activity.activity_status}</span></div><p className="text-xs text-muted-foreground">Turno {activity.shift_code}{activity.output_quantity != null ? ` · ${activity.output_quantity} ${activity.output_unit || ''}` : ''}</p></div>)}{data.operatorActivity.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Sin actividad operacional registrada todavía.</p> : null}</div></div>
        </div>
      </section>

      <section className="border-b pb-5">
        <h2 className="text-base font-semibold">Competencias, credenciales y EPP</h2>
        <div className="mt-3 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
          {[
            ['Competencias', data.competencies.length],
            ['Credenciales', data.credentials.length],
            ['Asignaciones EPP', data.epp.length],
          ].map(([label, value]) => <div key={label} className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Casos e historial laboral</h2>
        {data.cases.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No existen eventos laborales registrados para esta persona.</p> : <div className="mt-2 divide-y border-y">{data.cases.map((event) => <div key={event.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{event.title}</span><Badge variant="outline">{event.event_type}</Badge>{event.severity ? <Badge variant="secondary">{event.severity}</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">{event.event_date} · {event.review_status}</p><p className="mt-1 text-sm">{event.description}</p>{event.employee_response ? <p className="mt-2 text-sm text-muted-foreground">Respuesta del trabajador: {event.employee_response}</p> : null}</div>)}</div>}
      </section>

      <StatePanel tone="neutral" title="Evidencia, no decisión automática" description="La ficha consolida hechos y evaluaciones. Un score o evento aislado no determina una desvinculación; cualquier decisión laboral debe revisar hechos, contexto, descargos y validaciones correspondientes." />
    </div>
  );
}
