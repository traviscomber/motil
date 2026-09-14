export type RegulatoryCanonicalEvidenceScope = 'assets' | 'documents' | 'hse' | 'inspections';

export type RegulatoryCanonicalEvidenceItem = {
  scope: Exclude<RegulatoryCanonicalEvidenceScope, 'inspections'>;
  source: 'canonical_assets_current' | 'documents' | 'hse_commitments' | 'hse_facilities';
  entityType: 'asset' | 'document' | 'hse_commitment' | 'hse_facility';
  entityId: string;
  label: string;
  canonicalRef: string;
  freshnessAt: string | null;
  provenance: Record<string, string | number | null>;
};

export type RegulatoryCanonicalEvidenceCoverage = {
  scope: RegulatoryCanonicalEvidenceScope;
  status: 'available' | 'permission_denied' | 'blocked_unscoped_source';
  source: string;
  reason: string | null;
};

type EvidenceContext = {
  supabase: any;
  organizationId: string;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalRef(source: string, id: unknown) {
  return `${source}:${String(id || '').trim()}`;
}

export async function loadRegulatoryCanonicalEvidence(
  context: EvidenceContext,
  allowedScopes: readonly RegulatoryCanonicalEvidenceScope[],
  limit = 25,
) {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit || 25), 100));
  const allowed = new Set(allowedScopes);
  const items: RegulatoryCanonicalEvidenceItem[] = [];
  const coverage: RegulatoryCanonicalEvidenceCoverage[] = [];

  if (allowed.has('assets')) {
    const { data, error } = await context.supabase
      .from('canonical_assets_current')
      .select('id,asset_code,name,asset_type,category,location,is_active,validation_status,source_file,source_sheet,source_row,updated_at')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    for (const row of data || []) {
      items.push({
        scope: 'assets',
        source: 'canonical_assets_current',
        entityType: 'asset',
        entityId: String(row.id),
        label: clean(row.asset_code) || clean(row.name) || String(row.id),
        canonicalRef: canonicalRef('canonical_assets_current', row.id),
        freshnessAt: row.updated_at || null,
        provenance: {
          source_file: row.source_file || null,
          source_sheet: row.source_sheet || null,
          source_row: row.source_row ?? null,
          validation_status: row.validation_status || null,
        },
      });
    }
    coverage.push({ scope: 'assets', status: 'available', source: 'canonical_assets_current', reason: null });
  } else {
    coverage.push({ scope: 'assets', status: 'permission_denied', source: 'canonical_assets_current', reason: 'No authorized asset/operations module for this user.' });
  }

  if (allowed.has('documents')) {
    const { data, error } = await context.supabase
      .from('documents')
      .select('id,scope,module,category,document_type,title,document_number,version,status,issue_date,valid_until,expiry_date,current_file_path,storage_path,updated_at')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    for (const row of data || []) {
      items.push({
        scope: 'documents',
        source: 'documents',
        entityType: 'document',
        entityId: String(row.id),
        label: clean(row.document_number) || clean(row.title) || String(row.id),
        canonicalRef: canonicalRef('documents', row.id),
        freshnessAt: row.updated_at || null,
        provenance: {
          module: row.module || null,
          category: row.category || null,
          document_type: row.document_type || null,
          version: row.version || null,
          status: row.status || null,
        },
      });
    }
    coverage.push({ scope: 'documents', status: 'available', source: 'documents', reason: null });
  } else {
    coverage.push({ scope: 'documents', status: 'permission_denied', source: 'documents', reason: 'No authorized document module for this user.' });
  }

  if (allowed.has('hse')) {
    const [commitments, facilities] = await Promise.all([
      context.supabase
        .from('hse_commitments')
        .select('id,commitment_id,description,requirement,status,due_date,source_file,source_row,source_hash,updated_at')
        .eq('organization_id', context.organizationId)
        .order('updated_at', { ascending: false })
        .limit(safeLimit),
      context.supabase
        .from('hse_facilities')
        .select('id,code,name,location,type,risk_level,source_file,source_row,source_hash,updated_at')
        .eq('organization_id', context.organizationId)
        .order('updated_at', { ascending: false })
        .limit(safeLimit),
    ]);
    if (commitments.error || facilities.error) throw commitments.error || facilities.error;
    for (const row of commitments.data || []) {
      items.push({
        scope: 'hse',
        source: 'hse_commitments',
        entityType: 'hse_commitment',
        entityId: String(row.id),
        label: clean(row.commitment_id) || clean(row.requirement) || String(row.id),
        canonicalRef: canonicalRef('hse_commitments', row.id),
        freshnessAt: row.updated_at || null,
        provenance: {
          source_file: row.source_file || null,
          source_row: row.source_row ?? null,
          source_hash: row.source_hash || null,
          status: row.status || null,
        },
      });
    }
    for (const row of facilities.data || []) {
      items.push({
        scope: 'hse',
        source: 'hse_facilities',
        entityType: 'hse_facility',
        entityId: String(row.id),
        label: clean(row.code) || clean(row.name) || String(row.id),
        canonicalRef: canonicalRef('hse_facilities', row.id),
        freshnessAt: row.updated_at || null,
        provenance: {
          source_file: row.source_file || null,
          source_row: row.source_row ?? null,
          source_hash: row.source_hash || null,
          risk_level: row.risk_level || null,
        },
      });
    }
    coverage.push({ scope: 'hse', status: 'available', source: 'hse_commitments+hse_facilities', reason: null });
  } else {
    coverage.push({ scope: 'hse', status: 'permission_denied', source: 'hse_commitments+hse_facilities', reason: 'No authorized HSE module for this user.' });
  }

  coverage.push({
    scope: 'inspections',
    status: 'blocked_unscoped_source',
    source: 'hse_inspections',
    reason: 'Current hse_inspections schema has no organization_id or equivalent tenant key; it is excluded until tenant isolation can be proven.',
  });

  return {
    items,
    count: items.length,
    coverage,
    sourceBoundary: 'tenant_scoped_canonical_refs_only',
    complianceVerdictCalculated: false,
  };
}
