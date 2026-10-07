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
import { MaintenanceSchedule } from '@/components/maintenance/maintenance-schedule';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { formatWorkOrderNumber } from '@/lib/maintenance/work-order-display';

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

type ScheduleItem = {
  id: string;
  assetName: string;
  taskName: string;
  nextScheduledDate: string;
  priority: 'high' | 'medium' | 'low';
  daysUntil: number;
};

type WorkOrdersT = Dictionary['app']['workOrders'];

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

function getStatusClass(status: string | null | undefined) {
  const value = normalizeText(status);
  if (['completed', 'completado'].includes(value)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['in_progress', 'en_progreso'].includes(value)) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
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
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('operational');

  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/work-orders', async (url: string) => {
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
        : scopeFilter === 'all' || order.record_scope === scopeFilter;
      const matchesDataHealth = !missingAssetOnly || !order.asset_name;
      const matchesSearch = !query || [order.work_order_number, formatWorkOrderNumber(order.work_order_number, locale), order.title, order.asset_name, order.assigned_to_name].some((value) => normalizeText(value).includes(query));
      const matchesStatus = statusFilter === 'all' || normalizeText(order.status) === statusFilter;
      const matchesPriority = priorityFilter === 'all' || normalizeText(order.priority) === priorityFilter;
      return matchesScope && matchesDataHealth && matchesSearch && matchesStatus && matchesPriority;
    });
  }, [locale, missingAssetOnly, priorityFilter, scopeFilter, search, statusFilter, workOrders]);

  const scheduleItems = useMemo(() => operationalWorkOrders
    .filter((order) => order.scheduled_date && !['completed', 'completado'].includes(normalizeText(order.status)))
    .map((order): ScheduleItem => {
      const scheduledDate = new Date(order.scheduled_date as string);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      scheduledDate.setHours(0, 0, 0, 0);
      const priority = normalizeText(order.priority);
      return {
        id: order.id,
        assetName: order.asset_name || t.noAsset,
        taskName: `${formatWorkOrderNumber(order.work_order_number, locale)} · ${order.title || t.untitled}`,
        nextScheduledDate: order.scheduled_date || '',
        priority: priority === 'critical' || priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'medium',
        daysUntil: Math.ceil((scheduledDate.getTime() - today.getTime()) / 86400000),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 7), [operationalWorkOrders, t]);

  const markScheduleComplete = async (scheduleId: string) => {
    setUpdatingScheduleId(scheduleId);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'request failed');
      }
      await mutate();
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{missingAssetOnly ? t.descriptionDataHealth : t.descriptionDefault}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {missingAssetOnly ? <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo">{t.viewAll}</Link></Button> : null}
          {!missingAssetOnly ? <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre">{t.progressiveClose}</Link></Button> : null}
          <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}><RefreshCw className="mr-2 h-4 w-4" />{t.refresh}</Button>
          <Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo/create"><Plus className="mr-2 h-4 w-4" />{t.newOrder}</Link></Button>
        </div>
      </section>

      {missingAssetOnly ? <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="flex items-start gap-3 p-4"><AlertCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-medium">{t.dataHealthBanner.title}</p><p className="mt-1 text-sm text-muted-foreground">{t.dataHealthBanner.description}</p></div></CardContent></Card> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([[t.summary.open, open], [t.summary.inProgress, inProgress], [t.summary.critical, critical], [t.summary.overdue, overdue]] as const).map(([label, value]) => (
          <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{String(label)}</p><p className="mt-1 text-2xl font-semibold">{Number(value)}</p><p className="mt-1 text-[11px] text-muted-foreground">{t.summary.footer}</p></CardContent></Card>
        ))}
      </div>

      {!missingAssetOnly && historicalWorkOrders.length > 0 ? <Card className="shadow-none"><CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{t.historicalBanner.title}</p><p className="text-muted-foreground">{fill(t.historicalBanner.description, { n: historicalWorkOrders.length })}</p></div><Button variant="outline" size="sm" onClick={() => setScopeFilter('historical')}>{t.historicalBanner.cta}</Button></CardContent></Card> : null}

      <Card className="shadow-none"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_170px_170px_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.filters.searchPlaceholder} className="pl-9" /></div>
        <Select value={missingAssetOnly ? 'operational' : scopeFilter} onValueChange={setScopeFilter} disabled={missingAssetOnly}><SelectTrigger><SelectValue placeholder={t.filters.origin} /></SelectTrigger><SelectContent><SelectItem value="operational">{t.filters.scope.operational}</SelectItem><SelectItem value="historical">{t.filters.scope.historical}</SelectItem><SelectItem value="all">{t.filters.scope.all}</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder={t.filters.status} /></SelectTrigger><SelectContent><SelectItem value="all">{t.filters.statuses.all}</SelectItem><SelectItem value="open">{t.filters.statuses.open}</SelectItem><SelectItem value="in_progress">{t.filters.statuses.inProgress}</SelectItem><SelectItem value="completed">{t.filters.statuses.completed}</SelectItem></SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger><SelectValue placeholder={t.filters.priority} /></SelectTrigger><SelectContent><SelectItem value="all">{t.filters.priorities.all}</SelectItem><SelectItem value="critical">{t.filters.priorities.critical}</SelectItem><SelectItem value="high">{t.filters.priorities.high}</SelectItem><SelectItem value="medium">{t.filters.priorities.medium}</SelectItem><SelectItem value="low">{t.filters.priorities.low}</SelectItem></SelectContent></Select>
        <Button variant="ghost" onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setScopeFilter('operational'); }}>{t.filters.clear}</Button>
      </div></CardContent></Card>

      {!missingAssetOnly && scheduleItems.length > 0 ? <Card className="shadow-none"><CardHeader className="pb-3"><CardTitle className="text-base">{t.schedule.title}</CardTitle></CardHeader><CardContent>{updatingScheduleId ? <p className="mb-3 text-sm text-muted-foreground">{t.schedule.updating}</p> : null}<MaintenanceSchedule schedules={scheduleItems} onMarkComplete={markScheduleComplete} /></CardContent></Card> : null}

      <Card className="shadow-none"><CardHeader className="pb-3"><CardTitle className="text-base">{missingAssetOnly ? t.listTitles.missingAsset : scopeFilter === 'historical' ? t.listTitles.historical : scopeFilter === 'all' ? t.listTitles.all : t.listTitles.operational}</CardTitle><p className="text-sm text-muted-foreground">{fill(t.counts, { filtered: filteredOrders.length, total: workOrders.length })}</p></CardHeader><CardContent>
        {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div> : error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-medium text-destructive">{t.states.loadError}</p><Button className="mt-4" variant="outline" onClick={() => void mutate()}>{t.states.retry}</Button></div> : filteredOrders.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{missingAssetOnly ? t.states.emptyDataHealth : t.states.empty}</div> : <div className="divide-y rounded-lg border">{filteredOrders.map((order) => {
          const historical = order.record_scope === 'historical';
          return <div key={order.id} className="grid gap-4 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(0,1.5fr)_minmax(160px,.8fr)_minmax(150px,.7fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{order.work_order_number ? formatWorkOrderNumber(order.work_order_number, locale) : t.noFolio}</span>
                <Badge variant="outline" className={getStatusClass(order.status)}>{getStatusLabel(order.status, t)}</Badge>
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
