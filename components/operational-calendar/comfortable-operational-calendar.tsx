'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  FileCheck,
  Landmark,
  ShoppingCart,
  Wrench,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useModuleAccess } from '@/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CalendarSource = 'maintenance' | 'hse' | 'legal' | 'procurement' | 'finance' | 'people';
type CalendarScope = 'active' | 'historical' | 'all';
type CalendarPeriod = '7' | '14' | 'month';

type OperationalCalendarItem = {
  id: string;
  source: CalendarSource;
  kind: string;
  date: string;
  title: string;
  reference: string | null;
  status_label: string;
  owner: string | null;
  location: string | null;
  href: string;
  historical: boolean;
  completed_at: string | null;
};

type CalendarResponse = {
  data: OperationalCalendarItem[];
  summary: {
    overdue: number;
    today: number;
    total: number;
    historical: number;
    by_source: Record<CalendarSource, number>;
  };
  warnings: string[];
  range: {
    today: string;
    scope: CalendarScope;
  };
};

const LABEL_WIDTH = 280;
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 78;
const BAR_HEIGHT = 44;

const PERIOD_CONFIG: Record<CalendarPeriod, { label: string; days: number; dayWidth: number }> = {
  '7': { label: '7 días', days: 7, dayWidth: 122 },
  '14': { label: '14 días', days: 14, dayWidth: 78 },
  month: { label: 'Mes', days: 31, dayWidth: 48 },
};

const SOURCE_META: Record<CalendarSource, { label: string; icon: LucideIcon; bar: string }> = {
  maintenance: {
    label: 'Mantenimiento',
    icon: Wrench,
    bar: 'border-border bg-muted text-foreground',
  },
  hse: {
    label: 'HSE',
    icon: ShieldCheck,
    bar: 'border-border bg-muted text-foreground',
  },
  legal: {
    label: 'Legal',
    icon: FileCheck,
    bar: 'border-border bg-muted text-foreground',
  },
  procurement: {
    label: 'Abastecimiento',
    icon: ShoppingCart,
    bar: 'border-border bg-muted text-foreground',
  },
  finance: {
    label: 'Finanzas',
    icon: Landmark,
    bar: 'border-border bg-muted text-foreground',
  },
  people: {
    label: 'Personas',
    icon: UsersRound,
    bar: 'border-border bg-muted text-foreground',
  },
};

const fetcher = async (url: string): Promise<CalendarResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el calendario operativo');
  return payload as CalendarResponse;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function diffDays(from: string, to: string) {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function buildDates(start: string, days: number) {
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

function formatMonth(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ComfortableOperationalCalendar() {
  const { ready, canView } = useModuleAccess();
  const { data: viewer, error: viewerError } = useSWR(ready && canView('mant_operaciones') ? '/api/maintenance/viewer-context' : null, async (url: string) => {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo verificar el permiso de creación');
    return response.json() as Promise<{ canCreateWorkOrder: boolean }>;
  }, { revalidateOnFocus: false });
  const [scope, setScope] = useState<CalendarScope>('active');
  const [source, setSource] = useState<'all' | CalendarSource>('all');
  const [period, setPeriod] = useState<CalendarPeriod>('7');
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<OperationalCalendarItem | null>(null);
  const [search, setSearch] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading, isValidating, mutate } = useSWR<CalendarResponse>(
    `/api/calendar/operational?days=120&scope=${scope}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );

  const today = data?.range.today || toDateKey(new Date());
  const currentAnchor = anchorDate || today;
  const periodConfig = PERIOD_CONFIG[period];
  const dates = useMemo(
    () => buildDates(currentAnchor, periodConfig.days),
    [currentAnchor, periodConfig.days],
  );
  const rangeEnd = dates.at(-1) || currentAnchor;
  const dayWidth = periodConfig.dayWidth;
  const totalWidth = LABEL_WIDTH + dates.length * dayWidth;
  const todayIndex = dates.indexOf(today);

  const items = useMemo(() => error ? [] : data?.data || [], [data?.data, error]);
  const firstDate = addDays(today, scope === 'active' ? -30 : -365);
  const lastDate = scope === 'historical' ? today : addDays(today, 120);
  const unavailable = isLoading || Boolean(error) || !data;
  const count = (value: number) => unavailable ? '—' : value;
  const summary = data?.summary || {
    overdue: 0,
    today: 0,
    total: 0,
    historical: 0,
    by_source: { maintenance: 0, hse: 0, legal: 0, procurement: 0, finance: 0, people: 0 },
  };

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CL');

    return items.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (term && ![item.title, item.reference, item.owner, item.kind, item.location]
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(term))) return false;

      const itemEnd = item.historical && item.completed_at
        ? item.completed_at.slice(0, 10)
        : item.date;

      return item.date <= rangeEnd && itemEnd >= currentAnchor;
    });
  }, [currentAnchor, items, rangeEnd, search, source]);

  const goToToday = () => {
    setAnchorDate(today);
    timelineRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const shiftPeriod = (direction: -1 | 1) => {
    const next = addDays(currentAnchor, direction * periodConfig.days);
    setAnchorDate(next < firstDate ? firstDate : next > lastDate ? lastDate : next);
    timelineRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    timelineRef.current?.scrollTo({ left: 0 });
  }, [period, currentAnchor]);

  useEffect(() => { setAnchorDate(null); setSelected(null); }, [scope]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario operativo continuo</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Actividades de Mantenimiento, HSE, Legal, Abastecimiento, Finanzas y Personas en una sola línea de tiempo de la organización.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ready && canView('mant_operaciones') && !viewerError && viewer?.canCreateWorkOrder === true ? <Button asChild size="sm"><Link href="/dashboard/mantenimiento/ordenes-trabajo/create">Crear OT</Link></Button> : null}
          <Button variant="outline" size="sm" onClick={() => shiftPeriod(-1)} disabled={currentAnchor <= firstDate}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarDays className="mr-1 h-4 w-4" /> Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftPeriod(1)} disabled={rangeEnd >= lastDate}>
            Siguiente <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_160px_210px_150px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar OT, evento, responsable o referencia"
            className="pl-9"
          />
        </div>
        <Select value={scope} onValueChange={(value) => setScope(value as CalendarScope)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Pendientes</SelectItem>
            <SelectItem value="historical">Históricos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(value) => setSource(value as 'all' | CalendarSource)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            <SelectItem value="maintenance">Mantenimiento ({count(summary.by_source.maintenance)})</SelectItem>
            <SelectItem value="hse">HSE ({count(summary.by_source.hse)})</SelectItem>
            <SelectItem value="legal">Legal ({count(summary.by_source.legal)})</SelectItem>
            <SelectItem value="procurement">Abastecimiento ({count(summary.by_source.procurement)})</SelectItem>
            <SelectItem value="finance">Finanzas ({count(summary.by_source.finance)})</SelectItem>
            <SelectItem value="people">Personas ({count(summary.by_source.people)})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(value) => setPeriod(value as CalendarPeriod)}>
          <SelectTrigger aria-label="Escala temporal"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 días</SelectItem>
            <SelectItem value="14">14 días</SelectItem>
            <SelectItem value="month">Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{filteredItems.length} visibles</Badge>
        <Badge variant="outline">{periodConfig.label}</Badge>
        <Badge variant="outline" className="border-destructive/40 text-destructive">{count(summary.overdue)} vencidos</Badge>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
          <History className="mr-1 h-3 w-3" />{count(summary.historical)} históricos
        </Badge>
        <Input type="date" aria-label="Ir a fecha" className="h-8 w-auto" min={firstDate} max={lastDate} value={currentAnchor} onChange={(event) => { const value = event.target.value; if (value && value >= firstDate && value <= lastDate) setAnchorDate(value); }} />
        <span className="ml-auto text-sm font-medium text-foreground">
          {formatShortDate(currentAnchor)} — {formatShortDate(rangeEnd)}
        </span>
      </div>

      {data?.warnings?.length ? (
        <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{data.warnings.join(' ')}</span>
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden shadow-none">
        <div ref={timelineRef} className="max-h-[72vh] overflow-auto bg-card">
          <div className="relative" style={{ width: totalWidth, minWidth: '100%' }}>
            <div className="sticky top-0 z-30 flex border-b bg-card/95 backdrop-blur" style={{ height: HEADER_HEIGHT }}>
              <div className="sticky left-0 z-40 flex shrink-0 items-end border-r bg-card px-3 pb-4" style={{ width: LABEL_WIDTH }}>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Actividad</p>
                  <p className="mt-1 text-base font-semibold">{filteredItems.length} registros en el período</p>
                </div>
              </div>

              <div className="relative flex" style={{ width: dates.length * dayWidth }}>
                {dates.map((dateKey, index) => {
                  const date = new Date(`${dateKey}T12:00:00`);
                  const isToday = dateKey === today;
                  const isWeekend = [0, 6].includes(date.getDay());
                  const monthStart = index === 0 || dateKey.slice(0, 7) !== dates[index - 1].slice(0, 7);

                  return (
                    <div
                      key={dateKey}
                      className={`relative shrink-0 border-r px-1 pb-3 pt-2 text-center ${isWeekend ? 'bg-muted/30' : ''} ${isToday ? 'bg-muted' : ''}`}
                      style={{ width: dayWidth }}
                    >
                      {monthStart ? (
                        <span className="absolute left-2 top-2 whitespace-nowrap text-[11px] font-semibold capitalize text-muted-foreground">
                          {formatMonth(dateKey)}
                        </span>
                      ) : null}
                      <div className="mt-7 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {date.toLocaleDateString('es-CL', { weekday: 'short' })}
                      </div>
                      <div className={`mt-1 text-lg font-semibold ${isToday ? 'text-foreground' : 'text-foreground'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded bg-muted" />)}
              </div>
            ) : null}

            {!isLoading && !error && filteredItems.length === 0 ? (
              <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                No hay registros dentro de este período. Usa Anterior, Siguiente o cambia la escala temporal.
              </div>
            ) : null}

            {!isLoading && !error ? filteredItems.map((item) => {
              const SourceIcon = SOURCE_META[item.source].icon;
              const rawEnd = item.historical && item.completed_at ? item.completed_at.slice(0, 10) : item.date;
              const clippedStart = item.date < currentAnchor ? currentAnchor : item.date;
              const clippedEnd = rawEnd > rangeEnd ? rangeEnd : rawEnd;
              const startIndex = Math.max(0, diffDays(currentAnchor, clippedStart));
              const duration = Math.max(1, diffDays(clippedStart, clippedEnd) + 1);
              const width = Math.max(dayWidth - 12, duration * dayWidth - 12);
              const left = LABEL_WIDTH + startIndex * dayWidth + 6;
              const barPrimary = period === 'month' ? item.reference || item.kind : item.title;
              const barSecondary = item.historical && item.completed_at
                ? `Completada ${formatShortDate(item.completed_at)}`
                : `${item.reference || item.kind} · ${item.status_label}`;

              return (
                <div key={item.id} className="relative border-b" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                  <div className="absolute inset-y-0 flex" style={{ left: LABEL_WIDTH, width: dates.length * dayWidth }}>
                    {dates.map((dateKey) => {
                      const date = new Date(`${dateKey}T12:00:00`);
                      const isWeekend = [0, 6].includes(date.getDay());
                      const isToday = dateKey === today;
                      return (
                        <div
                          key={dateKey}
                          className={`h-full shrink-0 border-r ${isWeekend ? 'bg-muted/20' : ''} ${isToday ? 'bg-muted/40' : ''}`}
                          style={{ width: dayWidth }}
                        />
                      );
                    })}
                  </div>

                  <div className="sticky left-0 z-20 flex h-full items-center gap-2 border-r bg-card px-3" style={{ width: LABEL_WIDTH }}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/70">
                      <SourceIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{item.title}</p>
                        {item.historical ? <History className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
                        {SOURCE_META[item.source].label} · {item.reference || item.kind}
                        {item.owner ? ` · ${item.owner}` : ''}
                        {item.location ? ` · ${item.location}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-label={`${item.title} · ${formatShortDate(item.date)}`}
                    title={`${item.title} · ${item.status_label}`}
                    className={`absolute z-10 flex items-center overflow-hidden rounded-lg border px-3 text-left transition hover:z-20 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${SOURCE_META[item.source].bar} ${item.historical ? 'opacity-80 saturate-75' : ''}`}
                    style={{ left, width, height: BAR_HEIGHT, top: (ROW_HEIGHT - BAR_HEIGHT) / 2 }}
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-4">{barPrimary}</p>
                      <p className="mt-1 truncate text-xs opacity-85">{barSecondary}</p>
                    </div>
                  </button>
                </div>
              );
            }) : null}

            {todayIndex >= 0 ? (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 border-l-2 border-foreground/40"
                style={{ left: LABEL_WIDTH + todayIndex * dayWidth + dayWidth / 2 }}
              />
            ) : null}
          </div>
        </div>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected ? SOURCE_META[selected.source].label : ''} · {selected?.reference || selected?.kind}</DialogDescription></DialogHeader>
          {selected ? <div className="space-y-4"><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Fecha</dt><dd>{formatShortDate(selected.date)}</dd></div><div><dt className="text-xs text-muted-foreground">Estado</dt><dd>{selected.status_label}</dd></div><div><dt className="text-xs text-muted-foreground">Responsable</dt><dd>{selected.owner || 'Sin asignar'}</dd></div><div><dt className="text-xs text-muted-foreground">Lugar</dt><dd>{selected.location || 'Sin registro'}</dd></div></dl><Button asChild><Link href={selected.href}>Abrir actividad en su área</Link></Button></div> : null}
        </DialogContent>
      </Dialog>
      <p className="text-xs leading-5 text-muted-foreground">
        Vista continua de solo lectura. Pulsa una barra para revisar la actividad y abrir su registro original; las modificaciones se realizan en el módulo responsable.
      </p>
    </div>
  );
}
