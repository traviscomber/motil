'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { SecondaryDetails } from '@/components/ui/secondary-details';
import { StatePanel } from '@/components/ui/state-panel';
import { FileSearch } from 'lucide-react';
import { useModuleAccess } from '@/hooks/use-module-access';

type Row = Record<string, string | number | null>;
type Response = { overview?: Row | null; topAssets?: Row[]; topProducts?: Row[]; topSuppliers?: Row[]; topCostCenters?: Row[]; validation?: Row | null; recentEvents?: Row[]; operationalProcurement?: Row | null; operationalProcurementEvents?: Row[]; treasury?: Row[]; treasuryAging?: Row[]; cashForecast?: Row[] };
type ConcentrationKey = 'assets' | 'products' | 'suppliers' | 'costCenters';

const fetcher = async (url: string): Promise<Response> => { const response = await fetch(url, { credentials: 'include' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Finanzas'); return payload; };
const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const currencyMoney = (value: unknown, currency: unknown) => { const code = String(currency || 'CLP').toUpperCase(); try { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(Number(value || 0)); } catch { return `${code} ${new Intl.NumberFormat('es-CL').format(Number(value || 0))}`; } };
const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));

const concentrationConfig: Record<ConcentrationKey, { label: string; labelKey: string; amountKey: string }> = {
  assets: { label: 'Activos', labelKey: 'asset_name', amountKey: 'recognized_clp' },
  products: { label: 'Productos', labelKey: 'product_name', amountKey: 'committed_clp' },
  suppliers: { label: 'Proveedores', labelKey: 'supplier_name', amountKey: 'committed_clp' },
  costCenters: { label: 'Centros de costo', labelKey: 'cost_center_code', amountKey: 'committed_clp' },
};

const agingLabels: Record<string, string> = { no_due_date: 'Sin vencimiento', current: 'Al día', overdue_1_30: '1–30 días vencido', overdue_31_60: '31–60 días vencido', overdue_61_90: '61–90 días vencido', overdue_90_plus: '90+ días vencido' };

export default function FinanzasPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/finance/executive', fetcher);
  const { canEdit, ready } = useModuleAccess();
  const [activeConcentration, setActiveConcentration] = useState<ConcentrationKey>('assets');
  const overview = data?.overview || {};
  const operationalProcurement = data?.operationalProcurement || {};
  const treasury = data?.treasury || [];
  const treasuryAging = data?.treasuryAging || [];
  const cashForecast = data?.cashForecast || [];
  const validationPassed = String(data?.validation?.status || '').toLowerCase() === 'passed';
  const rowsByType: Record<ConcentrationKey, Row[]> = { assets: data?.topAssets || [], products: data?.topProducts || [], suppliers: data?.topSuppliers || [], costCenters: data?.topCostCenters || [] };
  const config = concentrationConfig[activeConcentration];
  const rows = rowsByType[activeConcentration].slice(0, 5);

  if (error) return <StatePanel tone="error" title="No se pudo cargar Finanzas" description={error.message} />;
  if (isLoading || !data) return <StatePanel tone="loading" title="Cargando Finanzas" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="mt-1 text-3xl font-semibold tracking-tight">Finanzas</h1></div>
        <Link href="/dashboard/finanzas/trazabilidad" className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><FileSearch className="h-4 w-4"/>Ver trazabilidad</Link>
      </section>

      {error ? <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error.message}</div> : null}

      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-2">
        {[
          ['Costo reconocido', money(overview.recognized_clp)],
          ['Compras comprometidas', money(overview.committed_clp)],
        ].map(([label, value]) => <div key={label} className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{isLoading || error ? '—' : value}</p></div>)}
      </section>

      <section className="space-y-3 border-t pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Tesorería</h2></div>{ready && canEdit('fin_finanzas') ? <Link href="/dashboard/finanzas/pagos" className="text-sm font-medium text-primary hover:underline">Operar pagos</Link> : null}</div>
        {treasury.length === 0 ? <div className="rounded-lg border px-4 py-5 text-sm text-muted-foreground">No hay cuentas por pagar aprobadas.</div> : treasury.map((row) => <div key={String(row.currency)} className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
          {[
            [`Saldo ${String(row.currency || '')}`, currencyMoney(row.outstanding_amount, row.currency)],
            ['Vence ≤ 7 días', `${number(row.due_soon_count)} · ${currencyMoney(row.due_soon_amount, row.currency)}`],
            ['Vencido', `${number(row.overdue_count)} · ${currencyMoney(row.overdue_amount, row.currency)}`],
            ['Sin vencimiento', `${number(row.no_due_date_count)} · ${currencyMoney(row.no_due_date_amount, row.currency)}`],
            ['Sin conciliar', `${number(row.unreconciled_payment_count)} · ${currencyMoney(row.unreconciled_payment_amount, row.currency)}`],
          ].map(([label, value]) => <div key={label} className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-base font-semibold tracking-tight">{value}</p></div>)}
        </div>)}
        {treasuryAging.length > 0 ? <div className="overflow-hidden rounded-lg border"><div className="border-b px-4 py-3"><h3 className="text-sm font-semibold">Vencimientos por proveedor</h3></div>{treasuryAging.slice(0, 8).map((row, index) => <div key={`${String(row.supplier_id)}-${String(row.aging_bucket)}-${index}`} className="grid gap-1 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_180px_160px]"><span className="min-w-0 break-words text-sm font-medium">{String(row.supplier_name || 'Proveedor')}</span><span className="text-sm text-muted-foreground">{agingLabels[String(row.aging_bucket)] || String(row.aging_bucket)}</span><span className="text-sm font-semibold tabular-nums sm:text-right">{currencyMoney(row.outstanding_amount, row.currency)}</span></div>)}</div> : null}
      </section>

      {!isLoading && !error && Number(operationalProcurement.missing_cost_center_events || 0) > 0 ? <p className="text-sm text-amber-700 dark:text-amber-400">{number(operationalProcurement.missing_cost_center_events)} movimientos sin centro de costo.</p> : null}
      <SecondaryDetails>
      <p className="text-sm">Validación: {isLoading || error ? '—' : validationPassed ? 'Aprobada' : 'Revisar'} · {isLoading || error ? '—' : number(overview.event_count)} eventos</p>
      <section className="space-y-3 border-t pt-5">
        <div><h2 className="text-lg font-semibold">Proyección de caja</h2><p className="text-sm text-muted-foreground">Obligaciones por vencimiento. Las cuentas sin fecha se mantienen fuera del forecast y visibles como excepción.</p></div>
        {cashForecast.length === 0 ? <div className="rounded-lg border px-4 py-5 text-sm text-muted-foreground">No hay obligaciones aprobadas con saldo pendiente para proyectar.</div> : cashForecast.map((row) => <div key={`forecast-${String(row.currency)}`} className="space-y-2 rounded-lg border p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{String(row.currency || '')}</p><p className="text-xs text-muted-foreground">{number(row.open_payables)} obligación(es) abiertas</p></div><p className="text-sm font-semibold tabular-nums">Saldo {currencyMoney(row.total_outstanding_amount, row.currency)}</p></div>
          <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Vencido', row.overdue_amount],
              ['Próx. 7 días', row.due_next_7_amount],
              ['Próx. 30 días', row.due_next_30_amount],
              ['Próx. 60 días', row.due_next_60_amount],
              ['Próx. 90 días', row.due_next_90_amount],
            ].map(([label, value]) => <div key={label} className="bg-card px-3 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{currencyMoney(value, row.currency)}</p></div>)}
          </div>
          {Number(row.no_due_date_amount || 0) > 0 ? <p className="text-xs text-amber-700 dark:text-amber-400">Fuera del forecast: {number(row.no_due_date_count)} obligación(es) sin vencimiento por {currencyMoney(row.no_due_date_amount, row.currency)}.</p> : null}
          {row.next_due_date ? <p className="text-xs text-muted-foreground">Próximo vencimiento registrado: {String(row.next_due_date)}.</p> : null}
        </div>)}
      </section>

      <section className="space-y-3 border-t pt-5">
        <div><h2 className="text-lg font-semibold">Compras operativas</h2><p className="text-sm text-muted-foreground">Compromiso pendiente y costo ya recepcionado.</p></div>
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Compromiso pendiente', money(operationalProcurement.committed_clp)],
            ['Recepcionado', money(operationalProcurement.recognized_clp)],
            ['Eventos sin centro de costo', number(operationalProcurement.missing_cost_center_events)],
            ['Monto sin centro de costo', money(operationalProcurement.missing_cost_center_amount)],
          ].map(([label, value]) => <div key={label} className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{isLoading || error ? '—' : value}</p></div>)}
        </div>
        {Number(operationalProcurement.missing_cost_center_events || 0) > 0 ? <p className="text-sm text-amber-700 dark:text-amber-400">Compras sin centro de costo pendientes de revisión.</p> : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Dónde se concentra</h2><p className="text-sm text-muted-foreground">Principales concentraciones por dimensión.</p></div><div className="flex flex-wrap gap-1">{(Object.keys(concentrationConfig) as ConcentrationKey[]).map((key) => <button key={key} type="button" onClick={() => setActiveConcentration(key)} className={`rounded-md px-3 py-1.5 text-sm ${activeConcentration === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{concentrationConfig[key].label}</button>)}</div></div>
        <div className="overflow-hidden rounded-lg border">{rows.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Sin datos canónicos vinculados.</p> : rows.map((row, index) => <div key={`${String(row[config.labelKey])}-${index}`} className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:grid-cols-[32px_1fr_180px] md:items-center"><span className="text-sm text-muted-foreground">{index + 1}</span><span className="min-w-0 break-words text-sm font-medium">{String(row[config.labelKey] || 'Sin identificar')}</span><span className="text-sm font-semibold tabular-nums md:text-right">{money(row[config.amountKey])}</span></div>)}</div>
      </section>

      {(data?.recentEvents || []).length ? <section className="border-t pt-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Últimos registros auditados</h2><p className="text-xs text-muted-foreground">Origen y monto conservados para revisión.</p></div><Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/finanzas/trazabilidad">Ver todos</Link></div></section> : null}
      </SecondaryDetails>
    </div>
  );
}
