'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, CircleDashed, PackageSearch, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo verificar la preparación de la OT');
  return payload;
};

type MaterialRow = {
  shortage?: number | string | null;
  quantity_shortage?: number | string | null;
};

type SupplyStatus = {
  materials?: MaterialRow[] | null;
};

const shortage = (row: MaterialRow) => Number(row.shortage ?? row.quantity_shortage ?? 0);

export function WorkOrderExecutionReadiness({
  workOrderId,
  assignedToName,
  status,
}: {
  workOrderId: string;
  assignedToName?: string | null;
  status?: string | null;
}) {
  const shouldCheck = !['in_progress', 'completed', 'cancelled', 'canceled'].includes(status || '');
  const { data, error, isLoading } = useSWR(
    shouldCheck ? `/api/maintenance/work-orders/${workOrderId}/materials` : null,
    fetcher,
  );

  if (!shouldCheck) return null;

  const supply = (data?.data || data || {}) as SupplyStatus;
  const materials = Array.isArray(supply.materials) ? supply.materials : [];
  const shortageRows = materials.filter((row) => shortage(row) > 0);
  const hasAssignee = Boolean(assignedToName?.trim());
  const verificationPending = isLoading || Boolean(error);
  const blockers = (hasAssignee ? 0 : 1) + shortageRows.length;
  const ready = blockers === 0 && !verificationPending;

  return (
    <Card className="shadow-none" aria-label="Preparación para ejecutar">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Preparación para ejecutar</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Verificación previa informativa. No reemplaza la decisión del supervisor ni bloquea el inicio de la OT.
            </p>
          </div>
          {isLoading ? (
            <Badge variant="outline"><CircleDashed className="mr-1 h-3.5 w-3.5" />Verificando</Badge>
          ) : error ? (
            <Badge variant="outline"><AlertTriangle className="mr-1 h-3.5 w-3.5" />Verificar datos</Badge>
          ) : ready ? (
            <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Lista para iniciar</Badge>
          ) : (
            <Badge variant="outline"><AlertTriangle className="mr-1 h-3.5 w-3.5" />Requiere preparación</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          {hasAssignee ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">Responsable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasAssignee ? assignedToName : 'Falta asignar responsable antes de ejecutar el trabajo.'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          {isLoading ? <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : shortageRows.length > 0 || error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : materials.length > 0 ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">Materiales</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading
                ? 'Verificando requerimientos y cobertura de materiales…'
                : error
                  ? 'No fue posible verificar la cobertura. Revisar Materiales de la OT antes de iniciar.'
                  : shortageRows.length > 0
                    ? `${shortageRows.length} línea(s) tienen faltantes explícitos de cobertura.`
                    : materials.length > 0
                      ? 'Los requerimientos registrados no presentan faltantes de cobertura.'
                      : 'Sin requerimientos de material registrados. No se infiere que existan ni que estén cubiertos.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
