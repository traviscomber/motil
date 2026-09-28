'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

type CostCenter = { id: string; code: string; name: string };
type Row = {
  id: string;
  work_order_number: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  asset: { asset_code?: string | null; asset_name?: string | null; asset_type?: string | null; manufacturer?: string | null; model?: string | null; location?: string | null } | null;
  family_hint: string | null;
  suggested_centers: CostCenter[];
  suggestion_basis: string;
};

type Payload = { rows: Row[]; costCenters: CostCenter[]; canEdit: boolean; summary: { pending: number; withFamilyHint: number; withoutFamilyHint: number } };

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function CostCenterReview({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const t = dictionary.app.costCenterReview;
  const fetcher = async (url: string): Promise<Payload> => {
    const response = await fetch(url, { credentials: 'include' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || t.loadError);
    return payload;
  };
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/maintenance/cost-center-review', fetcher);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const rows = data?.rows || [];
  const centers = data?.costCenters || [];
  const current = rows[0] || null;

  const visibleCenters = useMemo(() => {
    if (!current) return [];
    const suggestedIds = new Set((current.suggested_centers || []).map((center) => center.id));
    const query = search.trim().toLowerCase();
    const filtered = centers.filter((center) => !query || `${center.code} ${center.name}`.toLowerCase().includes(query));
    return [...filtered].sort((a, b) => Number(suggestedIds.has(b.id)) - Number(suggestedIds.has(a.id)));
  }, [centers, current, search]);

  const assign = async () => {
    if (!current) return;
    const costCenterId = selected[current.id];
    if (!costCenterId) return setMessage(t.selectRequired);
    setSaving(current.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cost_center_id: costCenterId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || t.saveFailed);
      setSearch('');
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  return <div className="space-y-6">
    <section className="border-b pb-5">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Link></Button>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.description}</p>
    </section>

    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t.summary.pending}</p><p className="mt-1 text-2xl font-semibold">{data?.summary.pending ?? '—'}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t.summary.withFamilyHint}</p><p className="mt-1 text-2xl font-semibold">{data?.summary.withFamilyHint ?? '—'}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t.summary.withoutFamilyHint}</p><p className="mt-1 text-2xl font-semibold">{data?.summary.withoutFamilyHint ?? '—'}</p></CardContent></Card>
    </div>

    {error ? <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error.message}</div> : null}
    {message ? <div className="rounded-md border p-3 text-sm">{message}</div> : null}

    {isLoading ? <div className="h-72 animate-pulse rounded-lg bg-muted" /> : !current ? <Card className="shadow-none"><CardContent className="p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8" /><p className="mt-3 font-medium">{t.empty}</p></CardContent></Card> : <Card className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs text-muted-foreground">{current.work_order_number}</p><CardTitle className="mt-1 text-xl">{current.title || t.untitled}</CardTitle></div><span className="text-sm text-muted-foreground">{fill(t.pendingCountTemplate, { n: rows.length })}</span></div></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">{t.fields.equipment}</p><p className="mt-1 text-sm font-medium">{current.asset?.asset_name || t.fields.noEquipment}</p></div>
        <div><p className="text-xs text-muted-foreground">{t.fields.codeModel}</p><p className="mt-1 text-sm font-medium">{[current.asset?.asset_code, current.asset?.model].filter(Boolean).join(' · ') || t.fields.noData}</p></div>
        <div><p className="text-xs text-muted-foreground">{t.fields.location}</p><p className="mt-1 text-sm font-medium">{current.asset?.location || t.fields.noLocation}</p></div>
        <div><p className="text-xs text-muted-foreground">{t.fields.familyHint}</p><p className="mt-1 text-sm font-medium">{current.family_hint || t.fields.noEvidence}</p></div>
      </div>
      <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">{current.suggestion_basis}</p>
      <div className="space-y-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder} />
        <select value={selected[current.id] || ''} onChange={(event) => setSelected((prev) => ({ ...prev, [current.id]: event.target.value }))} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">{t.selectPlaceholder}</option>
          {visibleCenters.map((center) => <option key={center.id} value={center.id}>{center.code} · {center.name}{current.suggested_centers.some((item) => item.id === center.id) ? t.relatedSuffix : ''}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><Button asChild variant="outline"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.id}`}>{t.openFull}</Link></Button><Button onClick={assign} disabled={!data?.canEdit || !selected[current.id] || saving === current.id}>{saving === current.id ? t.saving : t.saveNext}</Button></div>
    </CardContent></Card>}
  </div>;
}
