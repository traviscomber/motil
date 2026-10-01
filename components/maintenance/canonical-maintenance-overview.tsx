'use client';

import Link from 'next/link';
import { ArrowRight, Boxes, Users, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ARIEL_CANONICAL_SOURCE, ARIEL_MAINTENANCE_FLOW, ARIEL_MAINTENANCE_TEAM, ARIEL_VEHICLES, ARIEL_VEHICLE_SUMMARY } from '@/lib/maintenance/ariel-canonical';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export function CanonicalMaintenanceOverview() {
  const fleet = [...ARIEL_VEHICLES].sort((a, b) => b.spend - a.spend);

  return (
    <section aria-labelledby="canonical-maintenance-title" className="border-y border-border py-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Base operativa canónica · {ARIEL_CANONICAL_SOURCE.provider}</p>
          <h2 id="canonical-maintenance-title" className="mt-1 text-lg font-semibold">Equipo, flujo y camionetas en un mismo contexto</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">La estructura entregada por Planificación se usa como referencia operacional del módulo. No reemplaza personas, activos ni OT: los conecta.</p>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/personal">Ver equipo <ArrowRight className="h-4 w-4" /></Link></Button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Equipo y responsabilidades</h3><Badge variant="outline">{ARIEL_MAINTENANCE_TEAM.length} personas</Badge></div>
          <div className="divide-y border-y">
            {ARIEL_MAINTENANCE_TEAM.map((member) => (
              <div key={member.name} className="grid gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                <div><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.role}</p></div>
                <p className="text-sm text-muted-foreground">{member.responsibilities.length ? member.responsibilities.join(' · ') : 'Rol definido en el organigrama; responsabilidades detalladas no incluidas en la fuente.'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Flujo de coordinación</h3></div>
          <div className="divide-y border-y">
            {ARIEL_MAINTENANCE_FLOW.map((edge) => (
              <div key={edge.from + edge.to} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 text-sm">
                <span className="font-medium">{edge.from}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><span>{edge.to}</span>
                <span className="col-span-3 text-xs text-muted-foreground">{edge.relationship}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-muted-foreground" /><div><h3 className="text-sm font-semibold">Camionetas y trazabilidad de mantenimiento</h3><p className="text-xs text-muted-foreground">Distribución + movimientos de la hoja DATA del archivo canónico.</p></div></div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{ARIEL_VEHICLE_SUMMARY.vehicles} vehículos</Badge>
            <Badge variant="outline">{ARIEL_VEHICLE_SUMMARY.maintenanceRecords} registros</Badge>
            <Badge variant="outline">{money.format(ARIEL_VEHICLE_SUMMARY.totalSpend)}</Badge>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto border-y">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-4 font-medium">Patente</th><th className="py-2 pr-4 font-medium">Activo</th><th className="py-2 pr-4 font-medium">Asignación</th><th className="py-2 pr-4 text-right font-medium">Registros</th><th className="py-2 pr-4 text-right font-medium">Costo</th><th className="py-2 text-right font-medium">Último</th></tr></thead>
            <tbody className="divide-y">
              {fleet.map((vehicle) => <tr key={vehicle.plate}><td className="py-2.5 pr-4 font-medium">{vehicle.plate}</td><td className="py-2.5 pr-4">{vehicle.brand} {vehicle.year}</td><td className="max-w-[420px] py-2.5 pr-4 text-muted-foreground">{vehicle.assignment}</td><td className="py-2.5 pr-4 text-right tabular-nums">{vehicle.records}</td><td className="py-2.5 pr-4 text-right tabular-nums">{money.format(vehicle.spend)}</td><td className="py-2.5 text-right tabular-nums text-muted-foreground">{vehicle.lastRecord || '—'}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Los costos mostrados son la suma directa de COSTO TOTAL por patente en la hoja DATA; no se infiere tipo de reparación cuando la fuente no lo especifica.</p>
      </div>
    </section>
  );
}
