'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  peopleOptions: Array<{ id: string; full_name: string; role_title: string | null; employment_status: string }>;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role_title: '',
    email: '',
    phone: '',
    rut: '',
    employment_status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    role_title: '',
    area: '',
    site_name: '',
    supervisor_person_id: '',
    shift_pattern: '',
    employment_type: '',
    start_date: new Date().toISOString().slice(0, 10),
  });

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

  function openEdit() {
    if (!data) return;
    setEditForm({
      full_name: data.person.full_name || '',
      role_title: data.person.role_title || '',
      email: data.person.email || '',
      phone: data.person.phone || '',
      rut: data.person.rut || '',
      employment_status: data.person.employment_status || 'active',
    });
    setSaveError(null);
    setEditOpen(true);
  }

  function openAssignment() {
    if (!data) return;
    const currentAssignment = data.assignments.find((item) => !item.end_date) || data.assignments[0] || null;
    setAssignmentForm({
      role_title: currentAssignment?.role_title || data.person.role_title || '',
      area: currentAssignment?.area || '',
      site_name: currentAssignment?.site_name || '',
      supervisor_person_id: currentAssignment?.supervisor_person_id || '',
      shift_pattern: currentAssignment?.shift_pattern || '',
      employment_type: currentAssignment?.employment_type || '',
      start_date: new Date().toISOString().slice(0, 10),
    });
    setAssignmentError(null);
    setAssignmentOpen(true);
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !assignmentForm.start_date) return;

    setAssignmentSaving(true);
    setAssignmentError(null);

    try {
      const response = await fetch('/api/rrhh/assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: data.person.id, ...assignmentForm }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar la asignación');

      setData((current) => {
        if (!current) return current;
        const closed = current.assignments.map((item) =>
          !item.end_date ? { ...item, end_date: assignmentForm.start_date, end_reason: 'Reasignación desde RRHH MOTIL' } : item
        );
        return {
          ...current,
          person: { ...current.person, role_title: payload.assignment.role_title || current.person.role_title },
          assignments: [payload.assignment, ...closed],
        };
      });
      setAssignmentOpen(false);
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : 'No se pudo guardar la asignación');
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !editForm.full_name.trim()) return;

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/rrhh/people', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: data.person.id, ...editForm }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar la persona');

      setData((current) => current ? { ...current, person: { ...current.person, ...payload.person } } : current);
      setEditOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo actualizar la persona');
    } finally {
      setSaving(false);
    }
  }

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
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Asignación actual</h2>
          <Button type="button" variant="outline" size="sm" onClick={openAssignment}>
            {currentAssignment ? 'Cambiar asignación' : 'Agregar asignación'}
          </Button>
        </div>
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

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentAssignment ? 'Cambiar asignación' : 'Agregar asignación'}</DialogTitle>
            <DialogDescription>
              Registra dónde trabaja la persona y a quién reporta. Al cambiarla, la asignación vigente queda en el historial.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={saveAssignment}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="assignment-role" className="text-sm font-medium">Cargo</label>
                <Input id="assignment-role" value={assignmentForm.role_title} onChange={(event) => setAssignmentForm((current) => ({ ...current, role_title: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assignment-area" className="text-sm font-medium">Área</label>
                <Input id="assignment-area" value={assignmentForm.area} onChange={(event) => setAssignmentForm((current) => ({ ...current, area: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="assignment-site" className="text-sm font-medium">Faena / lugar</label>
                <Input id="assignment-site" value={assignmentForm.site_name} onChange={(event) => setAssignmentForm((current) => ({ ...current, site_name: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assignment-supervisor" className="text-sm font-medium">Supervisor</label>
                <select
                  id="assignment-supervisor"
                  value={assignmentForm.supervisor_person_id}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, supervisor_person_id: event.target.value }))}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Sin supervisor informado</option>
                  {data.peopleOptions.filter((option) => option.id !== person.id).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.full_name}{option.role_title ? ` · ${option.role_title}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="assignment-shift" className="text-sm font-medium">Turno</label>
                <Input id="assignment-shift" placeholder="Ej. 7x7" value={assignmentForm.shift_pattern} onChange={(event) => setAssignmentForm((current) => ({ ...current, shift_pattern: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assignment-type" className="text-sm font-medium">Vínculo</label>
                <Input id="assignment-type" placeholder="Ej. Contrato indefinido" value={assignmentForm.employment_type} onChange={(event) => setAssignmentForm((current) => ({ ...current, employment_type: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assignment-start" className="text-sm font-medium">Desde</label>
                <Input id="assignment-start" type="date" required value={assignmentForm.start_date} onChange={(event) => setAssignmentForm((current) => ({ ...current, start_date: event.target.value }))} />
              </div>
            </div>

            {assignmentError ? <p className="text-sm text-destructive">{assignmentError}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignmentOpen(false)} disabled={assignmentSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={assignmentSaving || !assignmentForm.start_date}>
                {assignmentSaving ? 'Guardando…' : 'Guardar asignación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar persona</DialogTitle>
            <DialogDescription>
              Actualiza los datos básicos de RR.HH. La actividad operacional no se modifica desde aquí.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={savePerson}>
            <div className="space-y-1.5">
              <label htmlFor="edit-full-name" className="text-sm font-medium">Nombre completo</label>
              <Input
                id="edit-full-name"
                required
                value={editForm.full_name}
                onChange={(event) => setEditForm((current) => ({ ...current, full_name: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-role" className="text-sm font-medium">Cargo</label>
              <Input
                id="edit-role"
                value={editForm.role_title}
                onChange={(event) => setEditForm((current) => ({ ...current, role_title: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-email" className="text-sm font-medium">Correo</label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-phone" className="text-sm font-medium">Teléfono</label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-rut" className="text-sm font-medium">RUT</label>
                <Input
                  id="edit-rut"
                  value={editForm.rut}
                  onChange={(event) => setEditForm((current) => ({ ...current, rut: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-status" className="text-sm font-medium">Estado</label>
                <select
                  id="edit-status"
                  value={editForm.employment_status}
                  onChange={(event) => setEditForm((current) => ({ ...current, employment_status: event.target.value }))}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="terminated">Desvinculado</option>
                </select>
              </div>
            </div>

            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !editForm.full_name.trim()}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
