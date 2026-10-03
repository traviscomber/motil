export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { attachProductMedia, getProductMedia } from '@/lib/inventory/product-media';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const resource = request.nextUrl.searchParams.get('resource');
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';

  try {
    if (resource === 'products') {
      let query = context.supabase
        .from('canonical_products_v1')
        .select('id, product_code, name, unit, standard_cost, family')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .eq('is_purchasable', true)
        .order('name')
        .limit(30);
      if (q) query = query.or(`product_code.ilike.%${q}%,name.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      const products = data || [];
      const media = await getProductMedia(context.supabase, context.organizationId, products.map((row) => row.id));
      return NextResponse.json({ products: attachProductMedia(products, media) });
    }

    if (resource === 'suppliers') {
      let query = context.supabase
        .from('canonical_suppliers_v1')
        .select('id, tax_id, legal_name, trade_name, payment_terms')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .order('legal_name')
        .limit(30);
      if (q) query = query.or(`tax_id.ilike.%${q}%,legal_name.ilike.%${q}%,trade_name.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ suppliers: data || [] });
    }

    if (resource === 'supplier_recommendations') {
      const requestId = request.nextUrl.searchParams.get('requestId');
      if (!requestId) return NextResponse.json({ error: 'Solicitud requerida' }, { status: 400 });

      const { data: requestLines, error: requestLinesError } = await context.supabase
        .from('canonical_procurement_request_lines_v1')
        .select('canonical_product_id, product_code')
        .eq('organization_id', context.organizationId)
        .eq('request_id', requestId);
      if (requestLinesError) throw requestLinesError;

      const productIds = (requestLines || []).map((line) => line.canonical_product_id).filter(Boolean) as string[];
      const productCodes = (requestLines || []).map((line) => line.product_code).filter(Boolean) as string[];
      if (!productIds.length && !productCodes.length) return NextResponse.json({ recommendations: [], recent: [] });

      let historyQuery = context.supabase
        .from('canonical_purchase_order_lines_v1')
        .select('purchase_order_id, canonical_product_id, product_code, unit_cost, quantity, unit')
        .eq('organization_id', context.organizationId)
        .not('unit_cost', 'is', null)
        .limit(2000);
      if (productIds.length) historyQuery = historyQuery.in('canonical_product_id', productIds);
      else historyQuery = historyQuery.in('product_code', productCodes);

      const { data: historyLines, error: historyError } = await historyQuery;
      if (historyError) throw historyError;

      const orderIds = Array.from(new Set((historyLines || []).map((line) => line.purchase_order_id).filter(Boolean))) as string[];
      if (!orderIds.length) return NextResponse.json({ recommendations: [], recent: [] });

      const { data: historyOrders, error: orderError } = await context.supabase
        .from('canonical_purchase_orders_v1')
        .select('id, order_number, order_date, supplier_name, supplier_tax_id, canonical_supplier_id, currency')
        .eq('organization_id', context.organizationId)
        .in('id', orderIds)
        .order('order_date', { ascending: false });
      if (orderError) throw orderError;

      const orderById = new Map((historyOrders || []).map((order) => [order.id, order]));
      const supplierIds = Array.from(new Set((historyOrders || []).map((order) => order.canonical_supplier_id).filter(Boolean))) as string[];
      const { data: suppliers, error: supplierError } = supplierIds.length
        ? await context.supabase.from('canonical_suppliers_v1').select('id, tax_id, legal_name, trade_name, payment_terms').eq('organization_id', context.organizationId).in('id', supplierIds).eq('is_active', true)
        : { data: [], error: null };
      if (supplierError) throw supplierError;
      const supplierById = new Map((suppliers || []).map((supplier) => [supplier.id, supplier]));

      type SupplierScore = {
        supplier: any;
        supplier_name: string;
        order_count: number;
        covered_products: Set<string>;
        last_order_date: string | null;
        last_order_number: string | null;
        last_unit_cost: number | null;
        currency: string | null;
      };
      const scores = new Map<string, SupplierScore>();
      const recentRows: any[] = [];

      for (const line of historyLines || []) {
        const order: any = orderById.get(line.purchase_order_id);
        if (!order?.canonical_supplier_id) continue;
        const supplier: any = supplierById.get(order.canonical_supplier_id);
        if (!supplier) continue;
        const key = supplier.id;
        const productKey = String(line.canonical_product_id || line.product_code || '');
        const current = scores.get(key) || {
          supplier,
          supplier_name: supplier.trade_name || supplier.legal_name || order.supplier_name,
          order_count: 0,
          covered_products: new Set<string>(),
          last_order_date: null,
          last_order_number: null,
          last_unit_cost: null,
          currency: order.currency || 'CLP',
        };
        current.order_count += 1;
        if (productKey) current.covered_products.add(productKey);
        if (!current.last_order_date || (order.order_date && order.order_date > current.last_order_date)) {
          current.last_order_date = order.order_date || null;
          current.last_order_number = order.order_number || null;
          current.last_unit_cost = line.unit_cost == null ? null : Number(line.unit_cost);
          current.currency = order.currency || 'CLP';
        }
        scores.set(key, current);
        recentRows.push({
          supplier,
          supplier_name: supplier.trade_name || supplier.legal_name || order.supplier_name,
          order_date: order.order_date,
          order_number: order.order_number,
          product_code: line.product_code,
          canonical_product_id: line.canonical_product_id,
          unit_cost: line.unit_cost == null ? null : Number(line.unit_cost),
          currency: order.currency || 'CLP',
        });
      }

      const requestedCount = Math.max(1, new Set([...productIds, ...productCodes]).size);
      const recommendations = Array.from(scores.values())
        .map((row) => ({
          ...row.supplier,
          supplier_name: row.supplier_name,
          order_count: row.order_count,
          covered_products: row.covered_products.size,
          coverage_ratio: row.covered_products.size / requestedCount,
          last_order_date: row.last_order_date,
          last_order_number: row.last_order_number,
          last_unit_cost: row.last_unit_cost,
          currency: row.currency,
        }))
        .sort((a, b) => b.coverage_ratio - a.coverage_ratio || b.covered_products - a.covered_products || b.order_count - a.order_count || String(b.last_order_date || '').localeCompare(String(a.last_order_date || '')))
        .slice(0, 5);

      const recent = recentRows
        .sort((a, b) => String(b.order_date || '').localeCompare(String(a.order_date || '')))
        .filter((row, index, rows) => rows.findIndex((other) => other.supplier.id === row.supplier.id) === index)
        .slice(0, 5);

      return NextResponse.json({ recommendations, recent });
    }

    const [requestsResult, requestLinesResult, quotationsResult, quotationLinesResult, ordersResult, orderLinesResult, receiptsResult, eventsResult] = await Promise.all([
      context.supabase.from('canonical_procurement_requests_v1').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('canonical_procurement_request_lines_v1').select('*').eq('organization_id', context.organizationId).order('created_at'),
      context.supabase.from('canonical_supplier_quotations_v1').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(200),
      context.supabase.from('canonical_supplier_quotation_lines_v1').select('*').eq('organization_id', context.organizationId).order('created_at'),
      context.supabase.from('canonical_purchase_orders_v1').select('id, order_number, order_date, supplier_name, total_amount, currency, operational_status, status, procurement_request_id, awarded_quotation_id, canonical_supplier_id, expected_delivery_date, created_at').eq('organization_id', context.organizationId).not('procurement_request_id', 'is', null).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('canonical_purchase_order_lines_v1').select('id, purchase_order_id, order_number, line_number, product_code, description, quantity, quantity_received, unit, unit_cost, net_amount, canonical_product_id').eq('organization_id', context.organizationId).not('procurement_request_line_id', 'is', null).order('line_number'),
      context.supabase.from('canonical_goods_receipts_v1').select('*').eq('organization_id', context.organizationId).order('received_at', { ascending: false }).limit(100),
      context.supabase.from('canonical_procurement_events_v1').select('*').eq('organization_id', context.organizationId).order('event_at', { ascending: false }).limit(200),
    ]);

    const warnings = [requestsResult, requestLinesResult, quotationsResult, quotationLinesResult, ordersResult, orderLinesResult, receiptsResult, eventsResult]
      .map((result) => result.error && typeof result.error === 'object' && 'message' in result.error ? String(result.error.message) : null)
      .filter(Boolean);
    if (warnings.length) console.warn('[procurement/workflow:get:partial]', warnings);

    return NextResponse.json({
      requests: requestsResult.data || [],
      requestLines: requestLinesResult.data || [],
      quotations: quotationsResult.data || [],
      quotationLines: quotationLinesResult.data || [],
      purchaseOrders: ordersResult.data || [],
      purchaseOrderLines: orderLinesResult.data || [],
      receipts: receiptsResult.data || [],
      events: eventsResult.data || [],
      partial: warnings.length > 0,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo cargar el flujo de abastecimiento';
    console.error('[procurement/workflow:get]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const action = String(body.action || '');
    let result;

    if (action === 'create_request') {
      result = await context.supabase.rpc('create_procurement_request', {
        p_payload: { ...(body.payload || {}), organization_id: context.organizationId },
        p_actor_id: context.userId,
        p_actor_name: body.actorName || null,
      });
    } else if (action === 'create_quotation') {
      result = await context.supabase.rpc('create_supplier_quotation', {
        p_payload: { ...(body.payload || {}), organization_id: context.organizationId },
        p_actor_id: context.userId,
      });
    } else if (action === 'award_quotation') {
      if (!body.quotationId) {
        return NextResponse.json({ error: 'Cotización requerida.' }, { status: 400 });
      }

      const { data: quotation, error: quotationError } = await context.supabase
        .from('canonical_supplier_quotations_v1')
        .select('id,request_id')
        .eq('organization_id', context.organizationId)
        .eq('id', body.quotationId)
        .maybeSingle();
      if (quotationError) throw quotationError;
      if (!quotation?.request_id) {
        return NextResponse.json({ error: 'Cotización o solicitud asociada no encontrada.' }, { status: 404 });
      }

      const { data: procurementRequest, error: requestError } = await context.supabase
        .from('canonical_procurement_requests_v1')
        .select('id,cost_center_code')
        .eq('organization_id', context.organizationId)
        .eq('id', quotation.request_id)
        .maybeSingle();
      if (requestError) throw requestError;
      const costCenterCode = String(procurementRequest?.cost_center_code || '').trim();
      if (!costCenterCode) {
        return NextResponse.json(
          { error: 'La solicitud necesita un centro de costo antes de adjudicar y emitir la OC.' },
          { status: 409 },
        );
      }

      const { data: costCenter, error: costCenterError } = await context.supabase
        .from('canonical_cost_centers_current')
        .select('id,cost_center_code,is_active,validation_status')
        .eq('organization_id', context.organizationId)
        .eq('cost_center_code', costCenterCode)
        .eq('is_active', true)
        .eq('validation_status', 'valid')
        .maybeSingle();
      if (costCenterError) throw costCenterError;
      if (!costCenter) {
        return NextResponse.json(
          { error: 'El centro de costo de la solicitud no es canónico, válido y activo.' },
          { status: 409 },
        );
      }

      result = await context.supabase.rpc('award_supplier_quotation_with_decision_v1', {
        p_quotation_id: body.quotationId,
        p_primary_reason: 'other',
        p_decision_notes: 'Adjudicación iniciada desde el flujo progresivo de compatibilidad; esta interfaz aún no captura un motivo estructurado.',
        p_actor_id: context.userId,
      });
    } else if (action === 'receive_purchase_order') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (!body.purchaseOrderId || lines.length === 0) {
        return NextResponse.json({ error: 'Selecciona una orden e ingresa al menos una cantidad recibida.' }, { status: 400 });
      }

      for (const line of lines) {
        const received = Number(line.quantity_received || 0);
        const accepted = Number(line.quantity_accepted || 0);
        const rejected = Number(line.quantity_rejected || 0);
        if (!Number.isFinite(received) || received <= 0) {
          return NextResponse.json({ error: 'Cada cantidad recibida debe ser mayor que cero.' }, { status: 400 });
        }
        if (![accepted, rejected].every((value) => Number.isFinite(value) && value >= 0)) {
          return NextResponse.json({ error: 'Las cantidades aceptadas y rechazadas deben ser válidas.' }, { status: 400 });
        }
        if (Math.abs(accepted + rejected - received) > 0.0001) {
          return NextResponse.json({ error: 'La cantidad aceptada más la rechazada debe coincidir con lo recibido.' }, { status: 400 });
        }
      }

      result = await context.supabase.rpc('receive_purchase_order', {
        p_purchase_order_id: body.purchaseOrderId,
        p_lines: lines,
        p_warehouse_code: body.warehouseCode || null,
        p_received_by: context.userId,
        p_received_by_name: body.receivedByName || null,
        p_notes: body.notes || null,
      });
    } else {
      return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }

    if (result.error) throw result.error;
    return NextResponse.json({ id: result.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar la operación';
    console.error('[procurement/workflow:post]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}