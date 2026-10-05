'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los requisitos');
  return payload;
};

function values(value: string) {
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
}

export default function RrhhReadinessRequirementsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/rrhh/readiness-policies', fetcher, { revalidateOnFocus: false });
  const [form, setForm] = useState({ site_name: '', role_title: '', credentials: '', competencies: '', epp: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const policies = Array.isArray(data?.policies) ? data.policies : [];
  const requirementCount = useMemo(
    () => policies.reduce((sum: number, policy: any) => sum + (policy.requirements?.length || 0), 0),
    [policies],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('/api/rrhh/readiness-policies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: form.site_name,
          role_title: form.role_title,
          credentials: values(form.credentials),
          competencies: values(form.competencies),
          epp: values(form.epp),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo crear la política');
      setForm({ site_name: '', role_title: '', credentials: '', competencies: '', epp: '' });
      await mutate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo crear la política');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>RRHH · Habilitación</PageHeaderEyebrow>
          <PageHeaderTitle>Requisitos por faena</PageHeaderTitle>
          <PageHeaderDescription>
            Define sólo exigencias formalmente conocidas. Una política vacía o inexistente nunca convierte una persona en APTO.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        {[
          ['Políticas activas', policies.length],
          ['Requisitos explícitos', requirementCount],
          ['Cobertura', data?.available ? 'Operativa' : 'Pendiente'],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{isLoading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {error ? <StatePanel tone="error" title="No se pudieron cargar las políticas" description={error.message} /> : null}
      {!error && data?.migration_required ? (
        <StatePanel
          tone="neutral"
          title="Modelo pendiente de release"
          description="La migración está versionada en la rama, pero todavía no se aplicó a la base productiva. La configuración permanece deshabilitada hasta el release gate."
        />
      ) : null}
      {!error && data?.error ? <StatePanel tone="error" title="Fuente de políticas no disponible" description={data.error} /> : null}

      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">Nueva política</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cargo vacío = requisito general para la faena. Los requisitos se ingresan separados por coma.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input required disabled={!data?.available} value={form.site_name} onChange={(event) => setForm((current) => ({ ...current, site_name: event.target.value }))} placeholder="Faena" />
          <Input disabled={!data?.available} value={form.role_title} onChange={(event) => setForm((current) => ({ ...current, role_title: event.target.value }))} placeholder="Cargo (opcional)" />
          <Input disabled={!data?.available} value={form.credentials} onChange={(event) => setForm((current) => ({ ...current, credentials: event.target.value }))} placeholder="Credenciales: licencia, autorización…" />
          <Input disabled={!data?.available} value={form.competencies} onChange={(event) => setForm((current) => ({ ...current, competencies: event.target.value }))} placeholder="Competencias: operación equipo, inducción…" />
          <Input disabled={!data?.available} value={form.epp} onChange={(event) => setForm((current) => ({ ...current, epp: event.target.value }))} placeholder="EPP: casco, protección auditiva…" />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!data?.available || saving}>{saving ? 'Guardando…' : 'Crear política'}</Button>
          {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
        </div>
      </form>

      {!isLoading && !error && policies.length === 0 && data?.available ? (
        <StatePanel tone="neutral" title="Sin políticas configuradas" description="MOTIL mantendrá todas las habilitaciones en estado CONDICIONAL hasta que exista una política explícita aplicable." />
      ) : null}

      {policies.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {policies.map((policy: any) => {
            const requirements = policy.requirements || [];
            return (
              <div key={policy.id} className="border-b px-4 py-4 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{policy.site_name}{policy.role_title ? ' · ' + policy.role_title : ''}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{policy.name}</p>
                  </div>
                  <Badge variant="outline">{requirements.length} requisito(s)</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {requirements.map((requirement: any) => (
                    <Badge key={requirement.id} variant="secondary">
                      {requirement.requirement_type === 'credential' ? 'Credencial' : requirement.requirement_type === 'competency' ? 'Competencia' : 'EPP'} · {requirement.requirement_name}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
