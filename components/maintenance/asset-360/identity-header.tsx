// Cabecera de identidad de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  Coins,
  FileText,
  Gauge,
  Hash,
  MapPin,
  ShieldCheck,
  Timer,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getEquipmentImageMeta } from '@/lib/maintenance/equipment-images';
import { date, money, number } from './format';
import { IdentityItem } from './primitives';

export type Asset360IdentityItem = readonly [string, string, LucideIcon, string | null];
export type Asset360DetailItem = readonly [string, string, LucideIcon, string?];
export type Asset360HeaderMetric = readonly [string, string | number, LucideIcon];

export type Asset360HeaderAsset = {
  name?: string | null;
  asset_code?: string | null;
  asset_type?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  license_plate?: string | null;
  cost_center_code?: string | null;
  cost_center_name?: string | null;
  cost_center_evidence_source?: string | null;
  location?: string | null;
  location_evidence_source?: string | null;
  location_evidence_at?: string | null;
  license_plate_evidence_source?: string | null;
  license_plate_evidence_at?: string | null;
  reference_manufacturer?: string | null;
  reference_manufacturer_evidence_at?: string | null;
  reference_family?: string | null;
  reference_family_evidence_at?: string | null;
  meter_unit?: string | null;
  mobility_class?: string | null;
  lifecycle_state?: string | null;
  acquisition_date?: string | null;
  acquisition_cost?: number | string | null;
  expected_lifespan_years?: number | string | null;
  baseline_mtbf_hours?: number | string | null;
  criticality?: string | null;
  operational_status?: string | null;
  operational_status_evidence_source?: string | null;
  operational_status_evidence_at?: string | null;
  operational_status_reason?: string | null;
};

export function Asset360IdentityHeader({
  asset,
  assetNoun,
  basePath,
  displayStatus,
  displayCriticality,
  metrics,
}: {
  asset: Asset360HeaderAsset;
  assetNoun: string;
  basePath: string;
  displayStatus: string | null;
  displayCriticality: string | null;
  metrics: readonly Asset360HeaderMetric[];
}) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const assetTypeLabel: Record<string, string> = {
    drill_rig: 'Equipo de perforación',
    truck: 'Camión',
    vehicle: 'Vehículo',
    excavator: 'Excavadora',
    loader: 'Cargador',
    pump: 'Bomba',
    conveyor: 'Correa transportadora',
  };
  const displayAssetType = asset.asset_type
    ? assetTypeLabel[String(asset.asset_type).toLowerCase()] || asset.category || asset.asset_type
    : asset.category || null;
  const technicalIdentity = [
    asset.manufacturer || (asset.reference_manufacturer ? `${asset.reference_manufacturer} (referencial)` : null),
    asset.model,
    displayAssetType || (asset.reference_family ? `Familia: ${asset.reference_family}` : null),
  ]
    .filter(Boolean)
    .join(' · ');
  const equipmentImage =
    getEquipmentImageMeta(`${asset.manufacturer || ''} ${asset.model || ''} ${asset.name || ''}`) ||
    getEquipmentImageMeta(`${asset.name || ''} ${asset.asset_type || ''} ${asset.category || ''}`);

  const imageFailed = Boolean(equipmentImage?.image && failedImageSrc === equipmentImage.image);

  const lifecycleLabel: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    maintenance: 'En mantención',
    retired: 'Retirado',
  };
  const mobilityLabel: Record<string, string> = {
    mobile: 'Móvil',
    fixed: 'Fijo',
    stationary: 'Estacionario',
  };
  const displayLifecycle = asset.lifecycle_state
    ? lifecycleLabel[String(asset.lifecycle_state).toLowerCase()] || asset.lifecycle_state
    : null;
  const displayMobility = asset.mobility_class
    ? mobilityLabel[String(asset.mobility_class).toLowerCase()] || asset.mobility_class
    : null;

  const primaryIdentity = [
    asset.cost_center_code
      ? [
          'Centro de costo',
          asset.cost_center_name ? `${asset.cost_center_code} · ${asset.cost_center_name}` : asset.cost_center_code,
          Building2,
          asset.cost_center_evidence_source === 'cost_centers_exact_identity'
            ? 'Resuelto por identidad exacta'
            : asset.cost_center_evidence_source === 'purchase_history_exact_identity'
              ? 'Resuelto por identidad exacta en histórico de compras'
              : null,
        ] as const
      : null,
    asset.location
      ? [
          'Ubicación',
          asset.location,
          MapPin,
          asset.location_evidence_source === 'planning_or_production_evidence'
            ? `Recuperada desde evidencia operacional${asset.location_evidence_at ? ` · ${date(asset.location_evidence_at)}` : ''}`
            : asset.location_evidence_at
              ? `${
                  asset.location_evidence_source === 'asset_operational_state_v1'
                    ? 'Estado operacional consolidado'
                    : asset.location_evidence_source === 'maintenance_canonical_assets_v1'
                      ? 'Maestro canónico'
                      : 'Evidencia operacional'
                } · ${date(asset.location_evidence_at)}`
              : null,
        ] as const
      : null,
    asset.license_plate
      ? [
          'Patente',
          asset.license_plate,
          ShieldCheck,
          asset.license_plate_evidence_source === 'deterministic_name_plate'
            ? `Recuperada desde el nombre del activo${asset.license_plate_evidence_at ? ` · ${date(asset.license_plate_evidence_at)}` : ''}`
            : null,
        ] as const
      : asset.serial_number
        ? ['N° de serie', asset.serial_number, ShieldCheck, null] as const
        : null,
  ].filter(Boolean) as Asset360IdentityItem[];

  const assetDetails = [
    asset.manufacturer
      ? ['Fabricante', asset.manufacturer, Building2] as const
      : asset.reference_manufacturer
        ? [
            'Fabricante referencial',
            asset.reference_manufacturer,
            Building2,
            asset.reference_manufacturer_evidence_at
              ? `Extraído del nombre · ${date(asset.reference_manufacturer_evidence_at)}`
              : 'Extraído del nombre',
          ] as const
        : null,
    asset.model ? ['Modelo', asset.model, Hash] as const : null,
    asset.license_plate ? ['Patente', asset.license_plate, Hash] as const : null,
    asset.meter_unit ? ['Unidad de control', asset.meter_unit, Gauge] as const : null,
    displayMobility ? ['Movilidad', displayMobility, MapPin] as const : null,
    displayLifecycle ? ['Ciclo de vida', displayLifecycle, Activity] as const : null,
    !displayAssetType && asset.reference_family
      ? [
          'Familia referencial',
          asset.reference_family,
          Wrench,
          asset.reference_family_evidence_at ? `Derivada del nombre · ${date(asset.reference_family_evidence_at)}` : 'Derivada del nombre',
        ] as const
      : null,
    asset.acquisition_date ? ['Adquisición', date(asset.acquisition_date), CalendarDays] as const : null,
    asset.expected_lifespan_years != null
      ? ['Vida esperada', `${number(asset.expected_lifespan_years, 0)} años`, Timer] as const
      : null,
    asset.acquisition_cost != null
      ? ['Costo adquisición', money(asset.acquisition_cost), Coins] as const
      : null,
    asset.baseline_mtbf_hours != null
      ? ['MTBF base', `${number(asset.baseline_mtbf_hours, 0)} h`, Timer] as const
      : null,
  ].filter(Boolean) as Asset360DetailItem[];

  const links = [
    { href: `${basePath}/ficha-tecnica`, label: 'Ficha técnica', icon: Gauge },
    { href: `${basePath}/documentos`, label: 'Documentos', icon: FileText },
  ];

  return (
    <Card className="overflow-hidden border-border/80 shadow-none">
      <CardContent className="p-0">
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-md border border-border/70 bg-background">
              {equipmentImage && !imageFailed ? (
                <img
                  src={equipmentImage.image}
                  alt={`Imagen referencial de ${asset.name || 'equipo'}`}
                  className="h-40 w-full object-cover lg:h-full lg:min-h-52"
                  onError={() => setFailedImageSrc(equipmentImage.image)}
                />
              ) : (
                <div className="flex h-40 items-center justify-center px-5 text-center text-xs text-muted-foreground lg:h-full lg:min-h-52">
                  Imagen no disponible. La ficha sigue operativa.
                </div>
              )}
            </div>
            {equipmentImage && !imageFailed ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{equipmentImage.match === 'model' ? 'Referencia de modelo' : 'Referencia de familia'}</span>
                {equipmentImage.sourceUrl ? (
                  <a
                    href={equipmentImage.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {equipmentImage.sourceDomain || 'Fuente'}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                  {asset.name || asset.asset_code || assetNoun}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {asset.asset_code || 'Código no informado'}
                  </span>
                  {displayStatus ? (
                    <Badge variant="outline">{displayStatus}</Badge>
                  ) : null}
                  {displayCriticality ? (
                    <Badge variant={String(asset.criticality).toLowerCase().includes('crit') ? 'destructive' : 'secondary'}>
                      {displayCriticality}
                    </Badge>
                  ) : null}
                </div>
                {technicalIdentity ? (
                  <p className="mt-3 text-sm text-muted-foreground">{technicalIdentity}</p>
                ) : null}
                {asset.operational_status_evidence_at ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Estado {asset.operational_status_evidence_source === 'maintenance_asset_status_history' ? 'registrado' : 'actualizado'} el {date(asset.operational_status_evidence_at)}
                    {asset.operational_status_reason ? ` · ${asset.operational_status_reason}` : ''}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {links.map(({ href, label, icon: Icon }) => (
                  <Button key={href} asChild variant="outline" size="sm">
                    <Link href={href}>
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            {primaryIdentity.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {primaryIdentity.map(([label, value, Icon, meta]) => (
                  <IdentityItem key={label} icon={Icon} label={label} value={value} meta={meta} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-px border-t bg-border sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, Icon]) => (
            <div key={label} className="bg-card p-4">
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs">{label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>

        {assetDetails.length > 0 ? (
          <details className="group border-t border-border">
            <summary className="cursor-pointer list-none px-5 py-4">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Datos técnicos</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Información secundaria del maestro del equipo
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  {assetDetails.length} datos
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
              </span>
            </summary>
            <div className="border-t border-border px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {assetDetails.map(([label, value, Icon, meta]) => (
                  <IdentityItem key={label} icon={Icon} label={label} value={value} meta={meta || null} />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Identificación física del equipo</p>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${basePath}/qr`}>
                    Ver QR
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
