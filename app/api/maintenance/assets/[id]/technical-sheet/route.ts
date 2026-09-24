export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';
import { buildReferencePreventiveAlerts } from '@/lib/maintenance/technical-sheet-library';
import { resolveExplicitTechnicalReference } from '@/lib/maintenance/technical-reference-matcher';

type AssetRow = {
  id: string;
  asset_code: string | null;
  name: string | null;
  asset_type: string | null;
  location: string | null;
  operational_status: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  criticality: string | null;
  mtbf_hours: number | string | null;
  acquisition_date: string | null;
};

type TemplateRow = {
  id: string;
  vehicle_type: string | null;
  name: string | null;
  code: string | null;
  level: number | string | null;
  description: string | null;
};

type FaultModeRow = {
  id: string;
  component_template_id: string | null;
  fault_code: string | null;
  fault_name: string | null;
  severity: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeIdentity(value: string | null | undefined) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function brandMatches(manufacturer: string, brand: string) {
  const manufacturerText = normalizeText(manufacturer);
  const brandText = normalizeText(brand);
  if (!manufacturerText || !brandText) return false;
  if (manufacturerText === brandText || manufacturerText.includes(brandText) || brandText.includes(manufacturerText)) return true;
  if ((manufacturerText === 'cat' && brandText === 'caterpillar') || (manufacturerText === 'caterpillar' && brandText === 'cat')) return true;
  if ((manufacturerText === 'mitsubishi' && brandText === 'mitsubishi fuso') || (manufacturerText === 'mitsubishi fuso' && brandText === 'mitsubishi')) return true;
  return false;
}

function hasVerifiedReferenceIdentity(asset: AssetRow, reference: ReturnType<typeof resolveExplicitTechnicalReference>) {
  if (!reference || !asset.manufacturer || !asset.model) return false;
  const assetModel = normalizeIdentity(asset.model);
  const referenceModel = normalizeIdentity(reference.model);
  if (!assetModel || !referenceModel) return false;
  const modelMatches = assetModel === referenceModel || assetModel.includes(referenceModel) || referenceModel.includes(assetModel);
  return modelMatches && brandMatches(asset.manufacturer, reference.brand);
}

function familyMatchesTemplate(family: string | null, template: TemplateRow) {
  const familyText = normalizeText(family);
  const nameText = normalizeText(template.name);
  const vehicleTypeText = normalizeText(template.vehicle_type);

  if (!familyText) return Number(template.level || 0) <= 1;

  const familyHints: Record<string, string[]> = {
    camionetas: ['camioneta', 'hilux', 'terrano', 'frontier', 'amarok', 'f-150'],
    camiones: ['camion', 'cargo', 'volvo', 'auman', 'foton'],
    'cargadores de bajo perfil': ['cargador', 'scoop', 'bajo perfil'],
    'cargadores frontales': ['cargador frontal'],
    'camiones de bajo perfil': ['dumper', 'mk-a20', 'bajo perfil'],
    compresores: ['compresor'],
    'equipos de sondaje': ['sondaje', 'sonda'],
    'excavadoras y retroexcavadoras': ['excavadora', 'retroexcavadora'],
    'grupos generadores': ['generador', 'electrogeno'],
    planta: ['planta', 'correa', 'molino', 'chancadora'],
    exploracion: ['exploracion', 'perforacion', 'tronadura'],
    'proyectos en ejecucion': ['proyecto'],
  };

  const hints = familyHints[familyText] || [familyText];
  return hints.some((hint) => nameText.includes(hint) || vehicleTypeText.includes(hint));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const [assetResult, templateResult, faultModeResult] = await Promise.all([
      context.supabase
        .from('canonical_assets_current')
        .select('id, asset_code, name, asset_type, location, operational_status, manufacturer, model, serial_number, criticality, mtbf_hours, acquisition_date')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .maybeSingle(),
      context.supabase.from('components_template').select('id, vehicle_type, name, code, level, description'),
      context.supabase.from('fault_modes').select('id, component_template_id, fault_code, fault_name, severity'),
    ]);

    const safeTemplates = templateResult.error ? [] : templateResult.data;
    const safeFaultModes = faultModeResult.error ? [] : faultModeResult.data;
    let asset = !assetResult.error && assetResult.data ? (assetResult.data as AssetRow) : null;
    let assetOrigin: 'canonical_master' | 'cost_center_fallback' = 'canonical_master';

    if (!asset) {
      const { data: costCenter } = await context.supabase
        .from('cost_centers')
        .select('id, code, name, status')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .maybeSingle();

      if (costCenter) {
        assetOrigin = 'cost_center_fallback';
        asset = {
          id: costCenter.id,
          asset_code: costCenter.code ?? null,
          name: costCenter.name ?? null,
          asset_type: null,
          location: null,
          operational_status: costCenter.status ?? null,
          manufacturer: null,
          model: null,
          serial_number: null,
          criticality: null,
          mtbf_hours: null,
          acquisition_date: null,
        };
      }
    }

    if (!asset) {
      return NextResponse.json({ error: 'No se encontro el activo solicitado' }, { status: 404 });
    }

    const assetText = `${asset.name || ''} ${asset.asset_type || ''} ${asset.model || ''} ${asset.manufacturer || ''}`;
    const assetFamily = inferMachineFamilyFromText(assetText);
    const technicalReference = resolveExplicitTechnicalReference(assetText);
    const referenceIdentityVerified = assetOrigin === 'canonical_master' && hasVerifiedReferenceIdentity(asset, technicalReference);
    const trustedReference = referenceIdentityVerified ? technicalReference : null;
    const referenceFields = trustedReference
      ? [
          ...trustedReference.keySpecs.map((item) => ({ key: item.label, value: item.value })),
          { key: 'Fuente oficial', value: trustedReference.sourceLabel },
          { key: 'Familia', value: trustedReference.family },
        ]
      : [];

    const templateRows = Array.isArray(safeTemplates) ? (safeTemplates as TemplateRow[]) : [];
    const faultModeRows = Array.isArray(safeFaultModes) ? (safeFaultModes as FaultModeRow[]) : [];
    const suggestedTemplates = templateRows
      .filter((template) => familyMatchesTemplate(assetFamily, template))
      .map((template) => ({
        id: template.id,
        code: template.code,
        name: template.name,
        vehicleType: template.vehicle_type,
        level: template.level,
        description: template.description,
        faultModes: faultModeRows
          .filter((fault) => fault.component_template_id === template.id)
          .map((fault) => ({
            id: fault.id,
            code: fault.fault_code,
            name: fault.fault_name,
            severity: fault.severity,
          })),
      }))
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }));

    return NextResponse.json({
      asset: {
        id: asset.id,
        code: asset.asset_code,
        name: asset.name,
        type: asset.asset_type,
        location: asset.location,
        status: asset.operational_status,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serial_number,
        criticality: asset.criticality,
        mtbfHours: asset.mtbf_hours !== null && asset.mtbf_hours !== undefined ? Number(asset.mtbf_hours) : null,
        purchaseDate: asset.acquisition_date,
        lastMaintenance: null,
        nextMaintenance: null,
      },
      technicalSheet: {
        family: trustedReference?.family || null,
        sourceUrl: trustedReference?.sourceUrl || null,
        fields: referenceFields,
        rawSpecs: {},
        status: trustedReference ? 'trusted_reference_available' : technicalReference ? 'reference_candidate_pending_validation' : 'pending',
      },
      inferredFamily: assetFamily,
      referenceAuthority: trustedReference ? 'canonical_identity_match' : technicalReference ? 'reference_candidate_pending_validation' : 'none',
      referenceCandidate: technicalReference && !trustedReference
        ? {
            brand: technicalReference.brand,
            model: technicalReference.model,
            family: technicalReference.family,
            sourceUrl: technicalReference.sourceUrl,
            sourceLabel: technicalReference.sourceLabel,
          }
        : null,
      referenceSheet: trustedReference
        ? {
            brand: trustedReference.brand,
            model: trustedReference.model,
            family: trustedReference.family,
            sourceUrl: trustedReference.sourceUrl,
            sourceLabel: trustedReference.sourceLabel,
            summary: trustedReference.summary,
            keySpecs: trustedReference.keySpecs,
            components: trustedReference.components,
          }
        : null,
      preventiveAlerts: trustedReference ? buildReferencePreventiveAlerts(trustedReference) : [],
      componentProfile: suggestedTemplates,
      componentProfileAuthority: 'suggested_from_inferred_family_non_canonical',
      trustBoundary: 'Only an explicit model or alias signal can propose an OEM/model reference. Family similarity may suggest component templates, but it cannot materialize specifications, preventive alerts, operational status, or canonical identity. Verified manufacturer and model evidence is still required before the reference becomes trusted.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la ficha tecnica del activo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
