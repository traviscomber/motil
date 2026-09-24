// Deterministic purchase-history resolution for asset views.
// Resolves the match basis for canonical purchase lines and summarizes them
// without ever inventing cost centers, amounts or suppliers.

import { normalizeAssetIdentity } from '@/lib/maintenance/asset-identity-evidence';
import { getRedistributableMachineAssignment, type DerivedCostCenterMachine } from '@/lib/maintenance/cost-center-machines';

export function resolveExactCostCenter(input: {
  machines: DerivedCostCenterMachine[];
  normalizedIdentity: string;
  hasExplicitCostCenter: boolean;
}) {
  const { machines, normalizedIdentity, hasExplicitCostCenter } = input;
  const matches = machines.filter(
    (machine) => normalizedIdentity && normalizeAssetIdentity(machine.name) === normalizedIdentity,
  );
  const canonicalMatches = matches.filter((machine) => !getRedistributableMachineAssignment(machine.code));
  const exactCostCenter =
    !hasExplicitCostCenter && matches.length === 1
      ? matches[0]
      : !hasExplicitCostCenter && canonicalMatches.length === 1
        ? canonicalMatches[0]
        : null;
  return { matches, canonicalMatches, exactCostCenter };
}

export function resolvePurchaseExactCostCenter(input: {
  namePurchaseRows: Array<{ cost_center_code?: string | null }>;
  normalizedIdentity: string;
  hasExplicitCostCenter: boolean;
  exactCostCenterCode: string | null;
}) {
  const { namePurchaseRows, normalizedIdentity, hasExplicitCostCenter, exactCostCenterCode } = input;
  const matches = new Map<string, { code: string; description: string }>();
  if (!hasExplicitCostCenter && !exactCostCenterCode && normalizedIdentity) {
    for (const row of namePurchaseRows) {
      const rawCostCenter = String(row.cost_center_code || '').trim();
      const match = rawCostCenter.match(/^(\S+)\s+(.+)$/);
      if (!match) continue;
      const [, code, description] = match;
      if (normalizeAssetIdentity(description) !== normalizedIdentity) continue;
      if (!matches.has(code)) {
        matches.set(code, { code, description });
      }
    }
  }
  const candidates = [...matches.values()];
  const canonicalCandidates = candidates.filter(
    (candidate) => !getRedistributableMachineAssignment(candidate.code),
  );
  const purchaseExactCostCenter =
    candidates.length === 1
      ? candidates[0]
      : canonicalCandidates.length === 1
        ? canonicalCandidates[0]
        : null;
  return { candidates, canonicalCandidates, purchaseExactCostCenter };
}

export type PurchaseHistoryMatchBasis =
  | 'cost_center'
  | 'cost_center_derived'
  | 'purchase_cost_center_exact_identity'
  | 'name_model';

export function resolvePurchaseHistoryMatchBasis(input: {
  hasExplicitCostCenter: boolean;
  exactCostCenterCode: string | null;
  purchaseExactCostCenterCode: string | null;
}): PurchaseHistoryMatchBasis {
  const { hasExplicitCostCenter, exactCostCenterCode, purchaseExactCostCenterCode } = input;
  if (hasExplicitCostCenter) return 'cost_center';
  if (exactCostCenterCode) return 'cost_center_derived';
  if (purchaseExactCostCenterCode) return 'purchase_cost_center_exact_identity';
  return 'name_model';
}

export function selectPurchaseHistoryRows<T extends { id?: number | string }>(input: {
  matchBasis: PurchaseHistoryMatchBasis;
  explicitRows: T[];
  derivedRows: T[];
  derivedError: { message?: string } | null;
  purchaseRows: T[];
  purchaseError: { message?: string } | null;
  nameRows: T[];
}) {
  const { matchBasis, explicitRows, derivedRows, derivedError, purchaseRows, purchaseError, nameRows } = input;
  if (matchBasis === 'cost_center') return explicitRows;
  if (matchBasis === 'cost_center_derived' && !derivedError) return derivedRows;
  if (matchBasis === 'purchase_cost_center_exact_identity' && !purchaseError) return purchaseRows;
  return nameRows;
}

export function dedupePurchaseLines<T extends { id?: number | string }>(rows: T[]) {
  const seen = new Set<number | string>();
  const history = rows.filter((row) => {
    const key = row.id as number | string;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { history, duplicatesIgnored: Math.max(rows.length - history.length, 0) };
}

export function buildPurchaseHistorySummary<T extends {
  net_amount?: number | string | null;
  order_number?: string | null;
  supplier_name?: string | null;
  order_date?: string | null;
}>(rows: T[]) {
  return {
    purchaseLines: rows.length,
    pricedLines: rows.filter((row) => row.net_amount != null).length,
    unpricedLines: rows.filter((row) => row.net_amount == null).length,
    orders: new Set(rows.map((row) => row.order_number).filter(Boolean)).size,
    suppliers: new Set(rows.map((row) => row.supplier_name).filter(Boolean)).size,
    netSpend: rows.reduce((sum, row) => (row.net_amount != null ? sum + Number(row.net_amount) : sum), 0),
    lastOrderDate: rows.map((row) => row.order_date).filter(Boolean).sort().reverse()[0] || null,
    lastSupplier: rows[0]?.supplier_name || null,
  };
}
