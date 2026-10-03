'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Columns3,
  FileText,
  Home,
  CircleDollarSign,
  Users,
  Gem,
  Lightbulb,
  Route,
  Search,
  Shield,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuth } from '@/hooks/use-auth';
import { useModuleAccess } from '@/hooks/use-module-access';
import { canNavigateTo } from '@/lib/navigation-access';

type Destination = {
  group: string;
  label: string;
  keywords: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  moduleKey?: string;
};

const allRoles = [
  'superadmin',
  'admin',
  'manager',
  'supervisor',
  'viewer',
  'jefe_mantencion',
  'jefe_planta',
  'jefe_produccion',
  'Operaciones-Supervisor',
  'Finanzas-Supervisor',
  'Bodega-Supervisor',
  'Compras-Supervisor',
  'Sostenibilidad-Supervisor',
  'HSE-Supervisor',
];

const operationalRoles = [
  'superadmin',
  'admin',
  'manager',
  'supervisor',
  'jefe_mantencion',
  'jefe_planta',
  'jefe_produccion',
  'Operaciones-Supervisor',
  'Bodega-Supervisor',
  'Compras-Supervisor',
  'Sostenibilidad-Supervisor',
  'HSE-Supervisor',
];

const destinations: Destination[] = [
  { group: 'Operaciones', label: 'Geología', keywords: 'campos exploración geologia', href: '/dashboard/produccion/geologia', icon: Gem, moduleKey: 'prod_geologia' },
  { group: 'Administración', label: 'Finanzas', keywords: 'pagos facturas cuentas', href: '/dashboard/finanzas', icon: CircleDollarSign, roles: ['superadmin', 'admin', 'Finanzas-Supervisor'], moduleKey: 'fin_finanzas' },
  { group: 'Administración', label: 'Personas', keywords: 'rrhh recursos humanos personal', href: '/dashboard/rrhh', icon: Users, roles: ['superadmin', 'admin', 'manager'] },
  { group: 'Administración', label: 'Legal', keywords: 'contratos vencimientos propiedad minera', href: '/dashboard/legal', icon: FileText, roles: ['superadmin', 'admin', 'manager'], moduleKey: 'legal_modulo' },
  { group: 'General', label: 'Inicio', keywords: 'resumen ejecutivo', href: '/dashboard', icon: Home, roles: allRoles },
  { group: 'Control y mejora', label: 'Centro de gestión', keywords: 'control operación pendientes', href: '/dashboard/lean', icon: Route, roles: operationalRoles },
  { group: 'Control y mejora', label: 'Revisión diaria', keywords: 'reunión diaria control operación', href: '/dashboard/daily-management', icon: CalendarDays, roles: operationalRoles },
  { group: 'Control y mejora', label: 'Problemas operacionales', keywords: 'desviaciones causa acción respuesta', href: '/dashboard/andon', icon: AlertTriangle, roles: operationalRoles },
  { group: 'Control y mejora', label: 'Flujo de trabajo', keywords: 'trabajo pendientes bloqueos antigüedad', href: '/dashboard/kanban', icon: Columns3, roles: operationalRoles },
  { group: 'Control y mejora', label: 'Mejoras y seguimiento', keywords: 'mejora comprobar aplicar estandarizar ahorro', href: '/dashboard/kaizen', icon: Lightbulb, roles: operationalRoles },
  { group: 'General', label: 'Alertas', keywords: 'riesgos prioridades avisos', href: '/dashboard/alertas', icon: Bell, roles: ['superadmin', 'admin', 'manager', 'supervisor', 'jefe_mantencion'], moduleKey: 'core_alertas' },
  { group: 'General', label: 'Calendario operacional', keywords: 'tareas acciones compromisos fechas', href: '/dashboard/tareas', icon: ClipboardList, roles: allRoles },
  { group: 'General', label: 'Centros de costos', keywords: 'costos estructura imputación', href: '/dashboard/centros-costos', icon: Building2, roles: ['superadmin', 'admin', 'manager', 'Operaciones-Supervisor', 'Finanzas-Supervisor', 'jefe_mantencion'], moduleKey: 'core_centros_costos' },
  { group: 'Operaciones', label: 'Producción', keywords: 'rendimiento turnos', href: '/dashboard/produccion', icon: Activity, roles: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion', 'jefe_planta', 'jefe_produccion'], moduleKey: 'prod_operaciones' },
  { group: 'Operaciones', label: 'Monitoreo de equipos', keywords: 'sensores estado equipos', href: '/dashboard/telemetria', icon: Activity, roles: ['superadmin', 'admin', 'Operaciones-Supervisor'], moduleKey: 'prod_telemetria' },
  { group: 'Mantenimiento', label: 'Mantenimiento', keywords: 'equipos activos', href: '/dashboard/mantenimiento', icon: Wrench, roles: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'], moduleKey: 'mant_operaciones' },
  { group: 'Mantenimiento', label: 'Órdenes de trabajo', keywords: 'orden tareas trabajo', href: '/dashboard/mantenimiento/ordenes-trabajo', icon: ClipboardList, roles: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'], moduleKey: 'mant_operaciones' },
  { group: 'Mantenimiento', label: 'Planificación preventiva', keywords: 'calendario plan preventivo', href: '/dashboard/mantenimiento/planificacion', icon: CalendarDays, roles: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'], moduleKey: 'mant_operaciones' },
  { group: 'Abastecimiento', label: 'Bodega', keywords: 'inventario stock materiales existencias', href: '/dashboard/bodega', icon: Boxes, roles: ['superadmin', 'admin', 'Bodega-Supervisor', 'jefe_mantencion'], moduleKey: 'bodega_inventario' },
  { group: 'Abastecimiento', label: 'Compras y órdenes de compra', keywords: 'compras requerimientos', href: '/dashboard/compras', icon: ShoppingCart, roles: ['superadmin', 'admin', 'Compras-Supervisor'], moduleKey: 'fin_compras' },
  { group: 'Seguridad y sostenibilidad', label: 'Seguridad y sostenibilidad', keywords: 'seguridad ambiente riesgos', href: '/dashboard/sostenibilidad', icon: Shield, roles: ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'], moduleKey: 'sos_tablero' },
  { group: 'Seguridad y sostenibilidad', label: 'Calendario de compromisos', keywords: 'agenda fechas compromisos', href: '/dashboard/sostenibilidad/calendario', icon: CalendarDays, roles: ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager', 'supervisor'], moduleKey: 'sos_calendario' },
  { group: 'Administración', label: 'Gestión documental', keywords: 'documentos contratos archivos', href: '/dashboard/documentos-gestion', icon: FileText, roles: ['superadmin', 'admin', 'manager'], moduleKey: 'legal_contratos' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { role } = useAuth();
  const { enforced, canView, ready } = useModuleAccess();

  const availableDestinations = useMemo(() => {
    if (!role || !ready) return [];
    return destinations.filter((item) => canNavigateTo(item, role, enforced, canView));
  }, [role, ready, enforced, canView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (availableDestinations.length > 0) setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [availableDestinations.length]);

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!role || !ready || availableDestinations.length === 0) return null;

  const groups = Array.from(new Set(availableDestinations.map((item) => item.group)));

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden min-w-44 justify-start gap-2 border border-border/70 text-muted-foreground hover:text-foreground md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Ir a una sección de Motil"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Ir a…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Ir a una sección de Motil"
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Ir a una sección"
        description="Busca un área de trabajo disponible para tu rol"
        className="max-w-xl"
        showCloseButton={false}
      >
        <CommandInput placeholder="Buscar sección o tarea..." />
        <CommandList>
          <CommandEmpty>No se encontró una sección disponible.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {availableDestinations.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords}`}
                    onSelect={() => goTo(item.href)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>Solo se muestran áreas disponibles</span>
          <CommandShortcut>ESC para cerrar</CommandShortcut>
        </div>
      </CommandDialog>
    </>
  );
}
