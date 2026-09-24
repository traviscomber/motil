// Sección "Compras y abastecimiento" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { Building2, ChevronDown, Coins, PackageCheck } from 'lucide-react';
import { date, money, number } from './format';
import { IdentityItem, SectionSummary } from './primitives';

export type Asset360SupplyChainRow = {
  work_order_id: string;
  work_order_number?: string | null;
  title?: string | null;
  work_order_status?: string | null;
  priority?: string | null;
  scheduled_date?: string | null;
  material_requirement_count?: number | string | null;
  material_shortage_count?: number | string | null;
  material_shortage_quantity?: number | string | null;
  supply_need_count?: number | string | null;
  open_supply_need_count?: number | string | null;
  supply_needs_with_request?: number | string | null;
  procurement_request_count?: number | string | null;
  open_procurement_request_count?: number | string | null;
  promoted_procurement_request_count?: number | string | null;
  procurement_order_count?: number | string | null;
  undelivered_order_count?: number | string | null;
  delivered_order_count?: number | string | null;
  procurement_order_amount?: number | string | null;
  part_line_count?: number | string | null;
  parts_requested?: number | string | null;
  parts_issued?: number | string | null;
  parts_installed?: number | string | null;
  parts_cost?: number | string | null;
  stock_movement_count?: number | string | null;
  stock_movement_cost?: number | string | null;
  supply_chain_status?: string | null;
};

export type Asset360PurchaseHistorySummary = {
  purchaseLines?: number;
  pricedLines?: number;
  unpricedLines?: number;
  orders?: number;
  suppliers?: number;
  netSpend?: number | string | null;
  lastOrderDate?: string | null;
  lastSupplier?: string | null;
  matchBasis?: 'cost_center' | 'name_model' | string | null;
};

export type Asset360CostCenterPurchaseLine = {
  id: number;
  order_number?: string | null;
  line_number?: number | null;
  product_code?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_cost?: number | string | null;
  net_amount?: number | string | null;
  cost_center_code?: string | null;
  asset_reference?: string | null;
  supplier_name?: string | null;
  order_date?: string | null;
  status?: string | null;
};

export type Asset360ProcurementOrder = {
  id: string;
  order_number?: string | null;
  supplier_id?: string | null;
  status?: string | null;
  currency?: string | null;
  total_amount?: number | string | null;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  issued_at?: string | null;
  updated_at?: string | null;
  work_order_id?: string | null;
  supplier?: {
    id: string;
    legal_name?: string | null;
    trade_name?: string | null;
    payment_terms?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  supplierScore?: {
    supplier_id?: string | null;
    supplier_name?: string | null;
    total_orders?: number | string | null;
    completed_orders?: number | string | null;
    on_time_orders?: number | string | null;
    last_delivery_date?: string | null;
    receipt_count?: number | string | null;
    quantity_received?: number | string | null;
    quantity_accepted?: number | string | null;
    quantity_rejected?: number | string | null;
    returns_count?: number | string | null;
    delivery_score?: number | string | null;
    quality_score?: number | string | null;
    invoice_score?: number | string | null;
    operational_score?: number | string | null;
    evidence_dimensions?: number | string | null;
  } | null;
};

export function Asset360PurchaseSection({
  hasPurchaseEvidence,
  supplyChain,
  procurementOrders,
  costCenterPurchaseHistory,
  purchaseHistorySummary,
  openSupplyNeedsCount,
  materialShortageCount,
  costCenterCode,
}: {
  hasPurchaseEvidence: boolean;
  supplyChain: Asset360SupplyChainRow[];
  procurementOrders: Asset360ProcurementOrder[];
  costCenterPurchaseHistory: Asset360CostCenterPurchaseLine[];
  purchaseHistorySummary?: Asset360PurchaseHistorySummary;
  openSupplyNeedsCount: number;
  materialShortageCount: number;
  costCenterCode?: string | null;
}) {
  if (!hasPurchaseEvidence && supplyChain.length === 0) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Compras y abastecimiento"
        hint={openSupplyNeedsCount > 0
          ? `${openSupplyNeedsCount} necesidades abiertas`
          : purchaseHistorySummary?.lastSupplier
            ? `Última compra: ${purchaseHistorySummary.lastSupplier}`
            : 'Sin pendientes de abastecimiento'}
      />
      <div className="border-t border-border">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <IdentityItem
            icon={PackageCheck}
            label="Necesidades abiertas"
            value={openSupplyNeedsCount}
            meta={materialShortageCount > 0 ? `${materialShortageCount} quiebres de material` : 'Sin quiebres registrados'}
          />
          <IdentityItem
            icon={Coins}
            label="Gasto histórico neto registrado"
            value={purchaseHistorySummary?.netSpend != null ? money(purchaseHistorySummary.netSpend) : 'Sin base'}
            meta={Number(purchaseHistorySummary?.unpricedLines || 0) > 0
              ? `${number(purchaseHistorySummary?.unpricedLines || 0, 0)} líneas sin monto · corte ${date(purchaseHistorySummary?.lastOrderDate)}`
              : purchaseHistorySummary?.lastOrderDate
                ? `Hasta ${date(purchaseHistorySummary.lastOrderDate)}`
                : null}
          />
          <IdentityItem
            icon={Building2}
            label="Último proveedor"
            value={purchaseHistorySummary?.lastSupplier || procurementOrders[0]?.supplier?.trade_name || procurementOrders[0]?.supplier?.legal_name || null}
            meta={purchaseHistorySummary?.lastOrderDate ? `Última compra ${date(purchaseHistorySummary.lastOrderDate)}` : null}
          />
        </div>

        <details className="group border-t border-border px-4 py-4">
          <summary className="cursor-pointer list-none">
            <span className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Detalle de abastecimiento y compras</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  OT, órdenes de compra, proveedores y trazabilidad histórica
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </span>
          </summary>

          {supplyChain.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Abastecimiento por OT
              </p>
              <div className="mt-3 divide-y divide-border">
                {supplyChain.slice(0, 5).map((row) => (
                  <div key={row.work_order_id} className="grid gap-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)_150px_150px] lg:items-center">
                    <div>
                      <p className="font-mono text-xs">{row.work_order_number || 'OT sin número'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{date(row.scheduled_date)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.title || 'Mantención'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.supply_chain_status || 'Sin estado'} · {number(row.material_shortage_count || 0)} quiebres · {number(row.open_supply_need_count || 0)} necesidades abiertas
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Compras</p>
                      <p className="mt-1 text-sm font-medium">{number(row.procurement_order_count || 0)} OC</p>
                      <p className="mt-1 text-xs text-muted-foreground">{money(row.procurement_order_amount)}</p>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs text-muted-foreground">Materiales</p>
                      <p className="mt-1 text-sm font-medium">{number(row.parts_installed || 0)} instalados</p>
                      <p className="mt-1 text-xs text-muted-foreground">{money(row.parts_cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={supplyChain.length > 0 ? 'border-t border-border pt-4' : 'mt-4 border-t border-border pt-4'}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Compras y proveedores
              </p>
              {purchaseHistorySummary && Number(purchaseHistorySummary.purchaseLines || 0) > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {number(purchaseHistorySummary.orders || 0)} órdenes · {number(purchaseHistorySummary.suppliers || 0)} proveedores
                </p>
              ) : null}
            </div>

            {procurementOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {procurementOrders.slice(0, 5).map((order) => {
                  const supplierName =
                    order.supplier?.trade_name ||
                    order.supplier?.legal_name ||
                    order.supplierScore?.supplier_name ||
                    'Proveedor no informado';
                  return (
                    <div key={order.id} className="grid gap-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)_150px_180px] lg:items-center">
                      <div>
                        <p className="font-mono text-xs">{order.order_number || 'OC sin número'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{date(order.issued_at)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{supplierName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {order.status || 'Estado no informado'}
                          {order.expected_delivery_date ? ` · entrega esperada ${date(order.expected_delivery_date)}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monto OC</p>
                        <p className="mt-1 text-sm font-medium">
                          {order.total_amount != null ? `${order.currency || 'CLP'} ${number(order.total_amount, 0)}` : 'Sin monto'}
                        </p>
                      </div>
                      <div className="lg:text-right">
                        <p className="text-xs text-muted-foreground">Desempeño proveedor</p>
                        <p className="mt-1 text-sm font-medium">
                          {order.supplierScore?.operational_score != null
                            ? `${number(order.supplierScore.operational_score, 0)}/100`
                            : 'Sin score'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : costCenterPurchaseHistory.length > 0 ? (
              <div>
                <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {purchaseHistorySummary?.matchBasis === 'cost_center' ||
                  purchaseHistorySummary?.matchBasis === 'cost_center_derived' ||
                  purchaseHistorySummary?.matchBasis === 'purchase_cost_center_exact_identity'
                    ? `Historial recuperado desde el centro de costo ${costCenterCode || ''}${
                        purchaseHistorySummary?.matchBasis === 'cost_center_derived'
                          ? ' resuelto de forma determinística'
                          : purchaseHistorySummary?.matchBasis === 'purchase_cost_center_exact_identity'
                            ? ' identificado de forma exacta en el histórico de compras'
                            : ''
                      }. Se muestra como contexto económico del equipo.`
                    : 'Historial recuperado por coincidencia de nombre/modelo con centros de costo históricos. Se presenta como contexto del modelo/equipo y no como atribución unitaria cuando existen varias unidades similares.'}
                </div>
                <div className="divide-y divide-border">
                  {costCenterPurchaseHistory.slice(0, 8).map((line) => (
                    <div key={line.id} className="grid gap-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)_180px_140px] lg:items-center">
                      <div>
                        <p className="font-mono text-xs">{line.order_number || 'OC sin número'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{date(line.order_date)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.supplier_name || 'Proveedor no informado'}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {line.product_code || 'Sin código'} · {line.description || 'Sin descripción'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cantidad / unidad</p>
                        <p className="mt-1 text-sm font-medium">{line.quantity != null ? `${number(line.quantity, 1)} ${line.unit || ''}`.trim() : 'Sin cantidad'}</p>
                      </div>
                      <div className="lg:text-right">
                        <p className="text-xs text-muted-foreground">Monto neto</p>
                        <p className="mt-1 text-sm font-medium">{line.net_amount != null ? money(line.net_amount) : 'Sin monto'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin compras enlazadas al equipo.</p>
            )}
          </div>
        </details>
      </div>
    </details>
  );
}
