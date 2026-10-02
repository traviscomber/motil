'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, Eye, Plus, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { MobileTerrainPanel, WorkshopAssignedWorkPanel } from '@/components/maintenance/mobile-terrain-panel';

type WorkOrderItem = {
  id: string;
  status: string | null;
  priority: string | null;
  scheduled_date: string | null;
  asset_name: string | null;
  work_order_number: string | null;
  title: string | null;
  work_type?: string | null;
  assigned_to_name?: string | null;
  record_scope?: 'operational' | 'historical';
};

type WorkOrdersT = Dictionary['app']['workOrders'];
type ViewerContext = { mode?: 'leadership' | 'planning' | 'execution' | 'workshop' | 'oversight' | 'general'; canCreateWorkOrder?: boolean };

function normalizeText(value: string | null | undefined) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function getStatusLabel(status: string | null | undefined, t: WorkOrdersT) {
  const value = normalizeText(status);
  if (['completed', 'completado'].includes(value)) return t.status.completed;
  if (['in_progress', 'en_progreso'].includes(value)) return t.status.inProgress;
  if (['open', 'abierta', 'pending', 'pendiente'].includes(value)) return t.status.open;
  return status || t.status.none;
}

function getWorkTypeLabel(workType: string | null | undefined, t: WorkOrdersT) {
  const value = normalizeText(workType);
  if (value === 'corrective') return t.workType.corrective;
  if (value === 'preventive') return t.workType.preventive;
  if (value === 'predictive') return t.workType.predictive;
  return workType || t.workType.none;
}

function getPriorityLabel(priority: string | null | undefined, t: WorkOrdersT) {
  const value = normalizeText(priority);
  if (['critical', 'urgente'].includes(value)) return t.priority.critical;
  if (['high', 'alta'].includes(value)) return t.priority.high;
  if (['medium', 'media'].includes(value)) return t.priority.medium;
  if (['low', 'baja'].includes(value)) return t.priority.low;
  return priority || t.priority.none;
}

function getStatusVariant(status: string | null | undefined): 'default' | 'secondary' | 'outline' {
  const value = normalizeText(status);
  if (['completed', 'completado'].includes(value)) return 'secondary';
  if (['in_progress', 'en_progreso'].includes(value)) return 'default';
  return 'outline';
}

function isOverdue(order: WorkOrderItem) {
  if (!order.scheduled_date || ['completed', 'completado'].includes(normalizeText(order.status))) return false;
  const scheduled = new Date(order.scheduled_date);
  if (Number.isNaN(scheduled.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);
  return scheduled < today;
}

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function WorkOrdersQueue({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const t = dictionary.app.workOrders;
  const dateLocale = locale === 'en' ? 'en-US' : 'es-CL';
  const searchParams = useSearchParams();
  const missingAssetOnly = searchParams.get('dataHealth') === 'missing_asset';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('operational');

  const { data: viewer, isLoading: viewerLoading } = useSWR<ViewerContext>('/api/maintenance/viewer-context', async (url: string) => {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'request failed');
    return payload as ViewerContext;
  }, { revalidateOnFocus: false });

  const restrictedSurface = viewer?.mode === 'execution' || viewer?.mode === 'workshop';

  const { data, error, isLoading, mutate } = useSWR(!viewerLoading && !restrictedSurface ? '/api/maintenance/work-orders' : null, async (url: string) => {
    const response = await fetch(url, { credentials: 'include' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'request failed');
    return payload;
  });

  const workOrders = Array.isArray(data?.workOrders) ? (data.workOrders as WorkOrderItem[]) : [];
  const operationalWorkOrders = workOrders.filter((order) => order.record_scope !== 'historical');
  const historicalWorkOrders = workOrders.filter((order) => order.record_scope === 'historical');
  const open = operationalWorkOrders.filter((order) => ['open', 'pending', 'abierta', 'pendiente'].includes(normalizeText(order.status))).length;
  const inProgress = operationalWorkOrders.filter((order) => ['in_progress', 'en_progreso'].includes(normalizeText(order.status))).length;
  const critical = operationalWorkOrders.filter((order) => ['critical', 'urgente'].includes(normalizeText(order.priority))).length;
  const overdue = operationalWorkOrders.filter(isOverdue).length;

  const filteredOrders = useMemo(() => {
    const query = normalizeText(search);
    return workOrders.filter((order) => {
      const matchesScope = missingAssetOnly
        ? order.record_scope !== 'historical'
        : order.record_scope === scopeFilter;
      const matchesDataHealth = !missingAssetOnly || !order.asset_name;
      const matchesSearch = !query || [order.work_order_number, order.title, order.asset_name, order.assigned_to_name].some((value) => normalizeText(value).includes(query));
      const matchesStatus = statusFilter === 'all' || normalizeText(order.status) === statusFilter;
      const matchesPriority = priorityFilter === 'all' || normalizeText(order.priority) === priorityFilter;
      return matchesScope && matchesDataHealth && matchesSearch && matchesStatus && matchesPriority;
    });
  }, [missingAssetOnly, priorityFilter, scopeFilter, search, statusFilter, workOrders]);

  if (viewerLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }
  if (viewer?.mode === 'execution') return <MobileTerrainPanel />;
  if (viewer?.mode === 'workshop') return <WorkshopAssignedWorkPanel />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{missingAssetOnly ? t.descriptionDataHealth : t.descriptionDefault}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {missingAssetOnly
            ? <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo">{t.viewAll}</Link></Button>
            : <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}><RefreshCw className="mr-2 h-4 w-4" />{t.refresh}</Button>}
          {viewer?.canCreateWorkOrder ? <Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo/create"><Plus className="mr-2 h-4 w-4" />{t.newOrder}</Link></Button> : null}
        </div>
      </section>

      {missingAssetOnly ? <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="flex items-start gap-3 p-4"><AlertCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-medium">{t.dataHealthBanner.title}</p><p className="mt-1 text-sm text-muted-foreground">{t.dataHealthBanner.description}</p></div></CardContent></Card> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([[t.summary.open, open], [t.summary.inProgress, inProgress], [t.summary.critical, critical], [t.summary.overdue, overdue]] as const).map(([label, value]) => (
          <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{String(label)}</p><p className="mt-1 text-2xl font-semibold">{Number(value)}</p><p className="mt-1 text-[11px] text-muted-foreground">{t.summary.footer}</p></CardContent></Card>
        ))}
      </div>

      {!missingAssetOnly && historicalWorkOrders.length > 0 ? <Card className="shadow-none"><CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{t.historicalBanner.title}</p><p className="text-muted-foreground">{fill(t.historicalBanner.description, { n: historicalWorkOrders.length })}</p></div><Button variant="outline" size="sm" onClick={() => setScopeFilter('historical')}>{t.historicalBanner.cta}</Button></CardContent></Card> : null}

      <Card className="shadow-none"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_170px_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.filters.searchPlaceholder} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder={t.filters.status} /></SelectTrigger><SelectContent><SelectItem value="all">{t.filters.statuses.all}</SelectItem><SelectItem value="open">{t.filters.statuses.open}</SelectItem><SelectItem value="in_progress">{t.filters.statuses.inProgress}</SelectItem><SelectItem value="completed">{t.filters.statuses.completed}</SelectItem></SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger><SelectValue placeholder={t.filters.priority} /></SelectTrigger><SelectContent><SelectItem value="all">{t.filters.priorities.all}</SelectItem><SelectItem value="critical">{t.filters.priorities.critical}</SelectItem><SelectItem value="high">{t.filters.priorities.high}</SelectItem><SelectItem value="medium">{t.filters.priorities.medium}</SelectItem><SelectItem value="low">{t.filters.priorities.low}</SelectItem></SelectContent></Select>
        <Button variant="ghost" onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setScopeFilter('operational'); }}>{scopeFilter === 'historical' ? t.filters.scope.operational : t.filters.clear}</Button>
      </div></CardContent></Card>

      <Card className="shadow-none"><CardHeader className="pb-3"><CardTitle className="text-base">{missingAssetOnly ? t.listTitles.missingAsset : scopeFilter === 'historical' ? t.listTitles.historical : t.listTitles.operational}</CardTitle><p className="text-sm text-muted-foreground">{fill(t.counts, { filtered: filteredOrders.length, total: workOrders.length })}</p></CardHeader><CardContent>
        {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div> : error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-medium text-destructive">{t.states.loadError}</p><Button className="mt-4" variant="outline" onClick={() => void mutate()}>{t.states.retry}</Button></div> : filteredOrders.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{missingAssetOnly ? t.states.emptyDataHealth : t.states.empty}</div> : <div className="divide-y rounded-lg border">{filteredOrders.map((order) => {
          const historical = order.record_scope === 'historical';
          return <div key={order.id} className="grid gap-4 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(0,1.5fr)_minmax(160px,.8fr)_minmax(150px,.7fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{order.work_order_number || t.noFolio}</span>
                <Badge variant={getStatusVariant(order.status)}>{getStatusLabel(order.status, t)}</Badge>
                {historical ? <Badge variant="secondary">{t.historicalBadge}</Badge> : null}
                {!historical && isOverdue(order) ? <Badge variant="destructive">{t.overdueBadge}</Badge> : null}
                {!historical && !order.asset_name ? <Badge variant="destructive">{t.missingAssetBadge}</Badge> : null}
              </div>
              <p className="mt-2 truncate font-medium">{order.title || t.untitled}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{order.asset_name || (historical ? t.noAssetHistorical : t.noAsset)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.typeAndPriority}</p>
              <p className="mt-1 text-sm">{getWorkTypeLabel(order.work_type, t)} · {getPriorityLabel(order.priority, t)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.ownerAndDate}</p>
              <p className="mt-1 text-sm">{order.assigned_to_name || t.unassigned}</p>
              <p className="text-xs text-muted-foreground">{order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString(dateLocale) : t.noDate}</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${order.id}`}><Eye className="mr-2 h-4 w-4" />{t.viewDetail}</Link></Button>
          </div>;
        })}</div>}
      </CardContent></Card>
    </div>
  );
}
