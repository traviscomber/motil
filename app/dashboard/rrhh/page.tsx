'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type Person = {
  id: string;
  full_name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  employment_status: string;
  profile_id: string | null;
  evidence: {
    caseCount: number;
    openCaseCount: number;
    evaluationCount: number;
    latestScore: number | null;
    activityCount: number;
    workOrderCount: number;
  };
};

const emptyForm = {
  full_name: '',
  role_title: '',
  email: '',
  phone: '',
  rut: '',
  employment_status: 'active',
};

function employmentLabel(status: string) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'active') return 'Activo';
  if (value === 'inactive') return 'Inactivo';
  if (value === 'suspended') return 'Suspendido';
  if (value === 'terminated') return 'Desvinculado';
  return status || 'Sin estado';
}

export default function RrhhPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rrhh/people', { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar RRHH');
        return payload;
      })
      .then((payload) => {
        setPeople(payload.people || []);
        setError(null);
      })
      .catch((err) => {
        setPeople([]);
        setError(err instanceof Error ? err.message : 'No se pudo cargar RRHH');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return people;
    return people.filter((person) =>
      [person.full_name, person.rut, person.role_title, person.email, person.phone]
        .some((field) => String(field || '').toLowerCase().includes(value)),
    );
  }, [people, query]);

  const active = people.filter((person) => person.employment_status === 'active').length;
  const withRole = people.filter((person) => Boolean(person.role_title?.trim())).length;
  const withProfile = people.filter((person) => Boolean(person.profile_id)).length;
  const withoutProfile = people.filter((person) => !person.profile_id).length;
  const withoutRole = people.filter((person) => !person.role_title?.trim()).length;
  const countsUnavailable = loading || Boolean(error);

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.full_name.trim()) return;

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/rrhh/people', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo crear la persona');

      setPeople((current) =>
        [...current, payload.person].sort((a, b) => a.full_name.localeCompare(b.full_name, 'es')),
      );
      setForm(emptyForm);
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo crear la persona');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>RRHH</PageHeaderEyebrow>
          <PageHeaderTitle>Personas</PageHeaderTitle>
          <PageHeaderDescription>
            Consulta la dotación registrada, su cargo y la actividad operacional vinculada. Abre una persona para revisar su ficha.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button onClick={() => { setForm(emptyForm); setSaveError(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva persona
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          ['Personas', people.length],
          ['Activas', active],
          ['Con cargo', withRole],
          ['Con acceso', withProfile],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{countsUnavailable ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, cargo, correo o RUT"
          className="pl-9"
        />
      </div>

      {loading ? (
        <StatePanel tone="loading" title="Cargando personas" description="Reuniendo las fichas registradas en RRHH." />
      ) : null}
      {error ? (
        <StatePanel tone="error" title="No se pudo cargar RRHH" description={error + '. Los conteos permanecen sin dato hasta recuperar la fuente.'} />
      ) : null}
      {!loading && !error && filtered.length === 0 ? (
        <StatePanel tone="neutral" title="Sin personas" description="No hay personas que coincidan con la búsqueda." />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {filtered.map((person) => {
            const activity = person.evidence.workOrderCount + person.evidence.activityCount;
            return (
              <Link
                key={person.id}
                href={`/dashboard/rrhh/personas/${person.id}`}
                className="grid gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{person.full_name}</span>
                    <Badge variant={person.employment_status === 'active' ? 'secondary' : 'outline'}>
                      {employmentLabel(person.employment_status)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {person.role_title || 'Cargo pendiente'}
                    {person.email ? ` · ${person.email}` : ''}
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">
                  {activity > 0
                    ? `${person.evidence.workOrderCount} OT · ${person.evidence.activityCount} actividades`
                    : 'Sin actividad vinculada'}
                </div>

                <Badge variant={person.profile_id ? 'outline' : 'secondary'}>
                  {person.profile_id ? 'Con acceso' : 'Sin acceso'}
                </Badge>
              </Link>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && (withoutRole > 0 || withoutProfile > 0) ? (
        <StatePanel
          tone="neutral"
          title="Datos por completar"
          description={`${withoutRole} persona(s) sin cargo · ${withoutProfile} persona(s) sin acceso vinculado.`}
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva persona</DialogTitle>
            <DialogDescription>
              Registra sólo los datos básicos. La persona puede completarse después desde su ficha.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={createPerson}>
            <div className="space-y-1.5">
              <label htmlFor="rrhh-full-name" className="text-sm font-medium">Nombre completo</label>
              <Input
                id="rrhh-full-name"
                required
                value={form.full_name}
                onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rrhh-role" className="text-sm font-medium">Cargo</label>
              <Input
                id="rrhh-role"
                value={form.role_title}
                onChange={(event) => setForm((current) => ({ ...current, role_title: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="rrhh-email" className="text-sm font-medium">Correo</label>
                <Input
                  id="rrhh-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rrhh-phone" className="text-sm font-medium">Teléfono</label>
                <Input
                  id="rrhh-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="rrhh-rut" className="text-sm font-medium">RUT</label>
                <Input
                  id="rrhh-rut"
                  value={form.rut}
                  onChange={(event) => setForm((current) => ({ ...current, rut: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rrhh-status" className="text-sm font-medium">Estado</label>
                <select
                  id="rrhh-status"
                  value={form.employment_status}
                  onChange={(event) => setForm((current) => ({ ...current, employment_status: event.target.value }))}
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !form.full_name.trim()}>
                {saving ? 'Guardando…' : 'Crear persona'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
