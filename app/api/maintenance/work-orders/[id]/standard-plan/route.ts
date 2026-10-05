export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getMaintenanceWorkOrderScope, requireOperationalMaintenanceWorkOrder } from '@/lib/maintenance/work-order-scope';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const scope = await getMaintenanceWorkOrderScope(context.supabase, context.organizationId, id);
    if (scope === 'missing') return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });

    const { data: application, error: applicationError } = await context.supabase
      .from('maintenance_standard_job_plan_applications')
      .select('id,plan_id,applied_at')
      .eq('organization_id', context.organizationId)
      .eq('work_order_id', id)
      .eq('status', 'active')
      .maybeSingle();
    if (applicationError) throw applicationError;
    const canEdit = access.canWrite && scope === 'operational';
    if (!application?.plan_id) return NextResponse.json({ standardPlan: null, canEdit, record_scope: scope });

    const [{ data: plan, error: planError }, { data: steps, error: stepsError }, { data: materials, error: materialsError }, { data: execution, error: executionError }] = await Promise.all([
      context.supabase.from('maintenance_standard_job_plans').select('id,plan_code,name,work_type,status,estimated_duration_hours,labor_people_required,skill_requirement,safety_controls,required_document_reference,evidence_reference').eq('organization_id', context.organizationId).eq('id', application.plan_id).maybeSingle(),
      context.supabase.from('maintenance_standard_job_plan_steps').select('id,sequence_no,title,instructions,control_requirement,required_document_reference,estimated_minutes').eq('organization_id', context.organizationId).eq('plan_id', application.plan_id).order('sequence_no'),
      context.supabase.from('maintenance_standard_job_plan_materials').select('id,canonical_product_id,quantity_required,notes').eq('organization_id', context.organizationId).eq('plan_id', application.plan_id),
      context.supabase.from('work_order_standard_plan_execution_v1').select('plan_step_id,execution_status,observation,completed_by,completed_at').eq('organization_id', context.organizationId).eq('work_order_id', id),
    ]);
    const error = planError || stepsError || materialsError || executionError;
    if (error) throw error;
    if (!plan) return NextResponse.json({ standardPlan: null, canEdit, record_scope: scope });

    const productIds = [...new Set((materials || []).map((row: any) => row.canonical_product_id).filter(Boolean))];
    const productMap = new Map<string, any>();
    if (productIds.length) {
      const { data: products, error: productError } = await context.supabase.schema('canonical').from('products').select('id,product_code,name,unit').eq('organization_id', context.organizationId).in('id', productIds);
      if (productError) throw productError;
      for (const product of products || []) productMap.set(product.id, product);
    }
    const executionMap = new Map((execution || []).map((row: any) => [row.plan_step_id, row]));
    const enrichedSteps = (steps || []).map((step: any) => ({
      ...step,
      execution_status: executionMap.get(step.id)?.execution_status || 'pending',
      observation: executionMap.get(step.id)?.observation || null,
      completed_by: executionMap.get(step.id)?.completed_by || null,
      completed_at: executionMap.get(step.id)?.completed_at || null,
    }));

    return NextResponse.json({
      standardPlan: {
        ...plan,
        applied_at: application.applied_at,
        steps: enrichedSteps,
        pendingSteps: enrichedSteps.filter((row: any) => row.execution_status !== 'completed').length,
        completedSteps: enrichedSteps.filter((row: any) => row.execution_status === 'completed').length,
        materials: (materials || []).map((row: any) => ({ ...row, product: productMap.get(row.canonical_product_id) || null })),
      },
      canEdit,
      record_scope: scope,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el plan estándar de la OT' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const guard = await requireOperationalMaintenanceWorkOrder(context.supabase, context.organizationId, id);
    if (!guard.ok) return NextResponse.json({ error: guard.error, record_scope: guard.scope }, { status: guard.status });

    const body = await request.json().catch(() => null);
    const stepId = String(body?.stepId || '').trim();
    const observation = String(body?.observation || '').trim();
    if (!stepId) return NextResponse.json({ error: 'Paso requerido' }, { status: 400 });

    const { data: order, error: orderError } = await context.supabase.from('maintenance_work_orders').select('id,status').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: 'Orden no pertenece a la organización' }, { status: 404 });
    if (order.status === 'completed') return NextResponse.json({ error: 'La orden ya está cerrada' }, { status: 409 });

    const { data, error } = await context.supabase.rpc('complete_work_order_standard_plan_step_v1', {
      p_work_order_id: id,
      p_plan_step_id: stepId,
      p_observation: observation || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, executionId: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar el paso del plan estándar' }, { status: 500 });
  }
}
