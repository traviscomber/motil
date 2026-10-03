'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, FileWarning, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AlertRow = {
  alert_code: string;
  title: string;
  severity: string;
  exception_count: number;
  description: string;
};

type ExceptionRow = {
  exception_kind: string;
  line_id: number;
  purchase_order_id: string | null;
  order_number: string | null;
  line_number: number | null;
  product_code: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  net_amount: number | null;
  cost_center_code: string | null;
  validation_status: string | null;
  validation_notes: string[] | null;
  source_file: string | null;
  source_sheet: string | null;
  source_row: number | null;
  imported_at: string | null;
  supplier_name: string | null;
  source_date: string | null;
  recommended_action: string | null;
};

type ValidationRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_checks: number | null;
  failed_checks: number | null;
  canonical_events: number | null;
  recognized_clp: number | null;
  committed_clp: number | null;
  notes: string | null;
};

type ValidationResult = {
  id: number;
  check_code: string;
  scope: string;
  population: number | null;
  exceptions: number | null;
  source_total: number | null;
  ledger_total: number | null;
  difference: number | null;
  status: string;
};

type Payload = {
  issue: string | null;
  alerts: AlertRow[];
  rows: ExceptionRow[];
  validation: { run: ValidationRun | null; results: ValidationResult[] };
  canRunValidation: boolean;
  generatedAt: string;
};

const fetcher = async (url: string): Promise<Payload> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar las excepciones financieras');
  return payload;
};

const issueLabels: Record<string, string> = {
  validation: 'Validación',
  zero_amount_lines: 'Monto cero',
  missing_cost_centers: 'Centro de costo',
  source_warning_lines: 'Fuente con warning',
  unlinked_products: 'Producto sin cruce',
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function dateLabel(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('es-CL').format(parsed);
}

export default function FinanceExceptionsPage() {
  const params = useSearchParams();
  const issue = params.get('issue') || 'validation';
  const endpoint = '/api/finanzas/excepciones?issue=' + encodeURIComponent(issue);
  const { data, error, isLoading, mutate } = useSWR<Payload>(endpoint, fetcher, {
    revalidateOnFocus: false,
  });
  const [runningValidation, setRunningValidation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedAlert = data?.alerts.find((alert) => alert.alert_code === issue) || null;

  const runValidation = async () => {
    setRunningValidation(true);
    setValidationError(null);
    try {
      const response = await fetch('/api/finanzas/excepciones', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo ejecutar la validación');
      await mutate();
    } catch (cause) {
      setValidationError(cause instanceof Error ? cause.message : 'No se pudo ejecutar la validación');
    } finally {
      setRunningValidation(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Finanzas · Control</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Excepciones financieras</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Revisión de calidad sobre fuentes canónicas. Esta vista no corrige ni sobrescribe filas: muestra el caso, su lineage y la acción respaldada por evidencia.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/acciones">Volver a mis acciones</Link>
        </Button>
      </section>

      {error ? <StatePanel tone="error" title="No se pudo cargar el control financiero" description={error.message} /> : null}
      {isLoading ? <StatePanel tone="loading" title="Leyendo excepciones canónicas" /> : null}

      {!isLoading && !error && data ? (
        <>
          <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
            {data.alerts.map((alert) => {
              const active = alert.alert_code === issue;
              const href = '/dashboard/finanzas/excepciones?issue=' + encodeURIComponent(alert.alert_code);
              const className = 'bg-card p-4 transition-colors hover:bg-muted/30' + (active ? ' ring-1 ring-inset ring-primary' : '');
              return (
                <Link key={alert.alert_code} href={href} className={className}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{issueLabels[alert.alert_code] || alert.title}</p>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>{alert.exception_count}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{alert.title}</p>
                </Link>
              );
            })}
          </section>

          {selectedAlert ? (
            <Card className={selectedAlert.severity === 'critical' ? 'border-destructive/40 shadow-none' : 'shadow-none'}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{selectedAlert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedAlert.description}</p>
                  </div>
                </div>
                <Badge variant={selectedAlert.severity === 'critical' ? 'destructive' : 'outline'}>
                  {selectedAlert.exception_count} caso{selectedAlert.exception_count === 1 ? '' : 's'}
                </Badge>
              </CardContent>
            </Card>
          ) : null}

          {issue === 'validation' ? (
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Validación exhaustiva</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Comprueba moneda CLP, origen canónico, fuentes autorizadas, match completo contra activos/OC, duplicados, montos negativos y aritmética de líneas.
                    </p>
                  </div>
                  {data.canRunValidation ? (
                    <Button onClick={() => void runValidation()} disabled={runningValidation}>
                      <RefreshCw className={runningValidation ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                      {runningValidation ? 'Validando…' : 'Ejecutar validación'}
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
                {!data.validation.run ? (
                  <StatePanel
                    tone="empty"
                    title="Sin validación registrada"
                    description="No existe un run exhaustivo para esta organización. Ejecuta la validación para obtener evidencia por check."
                  />
                ) : (
                  <>
                    <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
                      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Estado</p><p className="mt-1 font-medium">{data.validation.run.status}</p></div>
                      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Checks</p><p className="mt-1 font-medium">{data.validation.run.total_checks ?? '—'}</p></div>
                      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Fallidos</p><p className="mt-1 font-medium">{data.validation.run.failed_checks ?? '—'}</p></div>
                      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Ejecutada</p><p className="mt-1 font-medium">{dateLabel(data.validation.run.completed_at || data.validation.run.started_at)}</p></div>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Check</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead className="text-right">Población</TableHead>
                            <TableHead className="text-right">Excepciones</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.validation.results.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.check_code}</TableCell>
                              <TableCell>{row.scope}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.population ?? '—'}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.exceptions ?? '—'}</TableCell>
                              <TableCell><Badge variant={row.status === 'passed' ? 'outline' : 'destructive'}>{row.status}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><FileWarning className="h-4 w-4" />Registros a revisar</CardTitle>
                <p className="text-sm text-muted-foreground">Muestra hasta 500 filas con archivo, hoja y fila de origen. La corrección debe ocurrir en la fuente o flujo dueño del dato.</p>
              </CardHeader>
              <CardContent className="p-0">
                {data.rows.length === 0 ? (
                  <div className="p-4"><StatePanel tone="empty" title="Sin filas para este control" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OC / línea</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Costo unit.</TableHead>
                          <TableHead className="text-right">Neto</TableHead>
                          <TableHead>Centro costo</TableHead>
                          <TableHead>Fuente</TableHead>
                          <TableHead>Control</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.rows.map((row) => (
                          <TableRow key={[row.exception_kind, row.line_id].join('-')}>
                            <TableCell>
                              <p className="font-medium">{row.order_number || '—'}</p>
                              <p className="text-xs text-muted-foreground">línea {row.line_number ?? '—'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="max-w-[260px] truncate font-medium">{row.product_code || row.description || 'Sin producto acreditado'}</p>
                              {row.product_code && row.description ? <p className="max-w-[260px] truncate text-xs text-muted-foreground">{row.description}</p> : null}
                            </TableCell>
                            <TableCell>{row.supplier_name || '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.quantity ?? '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(row.unit_cost)}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(row.net_amount)}</TableCell>
                            <TableCell>{row.cost_center_code || '—'}</TableCell>
                            <TableCell>
                              <p>{row.source_file || '—'}</p>
                              <p className="text-xs text-muted-foreground">{row.source_sheet || '—'} · fila {row.source_row ?? '—'}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={row.validation_status === 'valid' ? 'outline' : 'secondary'}>{row.validation_status || 'sin estado'}</Badge>
                              {row.validation_notes?.length ? <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">{row.validation_notes.join(' · ')}</p> : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {issue === 'missing_cost_centers' ? (
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Centro de costo</p>
                  <p className="mt-1 text-sm text-muted-foreground">Gestiona el catálogo sólo si el centro existe pero aún no está registrado; no inventes un centro para completar una fila.</p>
                </div>
                <Button asChild variant="outline"><Link href="/dashboard/finanzas/centros">Abrir centros de costos</Link></Button>
              </CardContent>
            </Card>
          ) : null}

          {(issue === 'zero_amount_lines' || issue === 'source_warning_lines') ? (
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Fuente canónica</p>
                  <p className="mt-1 text-sm text-muted-foreground">Las filas muestran lineage para corregir el origen. El importador financiero genérico no reemplaza canonical.purchase_order_lines.</p>
                </div>
                <Button asChild variant="outline"><Link href="/dashboard/finanzas/fuentes">Abrir fuentes</Link></Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
