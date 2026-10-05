import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const maintenanceWriteRoles = new Set([
  'superadmin',
  'admin',
  'operaciones-supervisor',
  'jefe_mantencion',
]);

// These endpoints only persist a user's own non-canonical conversation state.
// Their operational access is enforced by the endpoint's module guard; they do
// not create, alter, close, prioritize, or approve maintenance records.
const maintenanceSelfServiceMutationPaths = new Set([
  '/api/maintenance/senior-assistant',
]);

const productionWriteRoles = new Set([
  'superadmin',
  'admin',
  'operaciones-supervisor',
]);

const productionSelfServiceMutationPaths = new Set([
  '/api/produccion/geologia/assistant',
  '/api/produccion/geologia/hypotheses',
]);

export type OrganizationContext =
  | {
      ok: false;
      response: NextResponse;
    }
  | {
      ok: true;
      organizationId: string;
      userId: string;
      authUserId?: string;
      role?: string;
      userEmail?: string;
      userName?: string;
      supabase: ReturnType<typeof getSupabaseServerClient>;
    };

export type OrganizationSuccessContext = Extract<OrganizationContext, { ok: true }>;

export function isOrganizationSuccessContext(
  context: OrganizationContext
): context is OrganizationSuccessContext {
  return context.ok;
}

function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

function isMutation(request: NextRequest, prefix: string) {
  return (
    request.nextUrl.pathname.startsWith(prefix) &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
  );
}

function isProductionSelfServiceMutation(request: NextRequest) {
  return (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) &&
    productionSelfServiceMutationPaths.has(request.nextUrl.pathname)
  );
}

function isMaintenanceSelfServiceMutation(request: NextRequest) {
  return (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) &&
    maintenanceSelfServiceMutationPaths.has(request.nextUrl.pathname)
  );
}

function isAssignedWorkOrderExecutionMutation(request: NextRequest) {
  const method = request.method.toUpperCase();
  const path = request.nextUrl.pathname;

  if (method === 'PATCH' && /^\/api\/maintenance\/work-orders\/[^/]+$/.test(path)) {
    return true;
  }

  if (method === 'POST' && /^\/api\/maintenance\/work-orders\/[^/]+\/(timer|close)$/.test(path)) {
    return true;
  }

  return false;
}

export async function getOrganizationContext(
  request: NextRequest
): Promise<OrganizationContext> {
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return {
      ok: false,
      response:
        auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const role = normalizeRole(auth.role);
  if (
    isMutation(request, '/api/maintenance/') &&
    !isMaintenanceSelfServiceMutation(request) &&
    !isAssignedWorkOrderExecutionMutation(request) &&
    !maintenanceWriteRoles.has(role)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: maintenance write role required' },
        { status: 403 }
      ),
    };
  }

  if (
    isMutation(request, '/api/produccion/') &&
    !isProductionSelfServiceMutation(request) &&
    !productionWriteRoles.has(role)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: production write role required' },
        { status: 403 }
      ),
    };
  }

  // The service-role client has no end-user JWT. Forward the already verified
  // application identity so privileged database functions can still enforce
  // organization membership and write an accurate audit actor.
  const supabase = getSupabaseServerClient(auth.user.id);
  let userName = auth.user.full_name || auth.user.email || auth.user.id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name')
      .eq('id', auth.user.id)
      .maybeSingle();

    const profileName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

    if (profileName) userName = profileName;
  } catch {
    // Keep APIs usable even when profile enrichment fails.
  }

  return {
    ok: true,
    organizationId: auth.organizationId,
    userId: auth.user.id,
    authUserId: auth.user.auth_user_id,
    role: auth.role || undefined,
    userEmail: auth.user.email,
    userName,
    supabase,
  };
}
