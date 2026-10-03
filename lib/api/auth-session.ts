import { type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { verifyCustomSession } from '@/lib/auth/signed-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface AuthSessionUser {
  id: string;
  auth_user_id?: string;
  email?: string;
  full_name?: string;
  organization_id?: string;
}

export interface AuthContext {
  user: AuthSessionUser;
  role?: string;
  organizationId?: string;
  source: 'custom-cookie' | 'supabase';
}

type EnrichedIdentity = {
  applicationUserId?: string;
  authUserId?: string;
  role?: string;
  organizationId?: string;
  fullName?: string;
  active?: boolean;
};

function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase();
}

function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

function resolveEffectiveRole(profileRole?: string | null, assignedRole?: string | null) {
  const normalizedProfileRole = normalizeRole(profileRole);
  const normalizedAssignedRole = normalizeRole(assignedRole);

  if (normalizedProfileRole === 'superadmin' || normalizedProfileRole === 'super_admin') {
    return normalizedProfileRole;
  }

  return normalizedAssignedRole || normalizedProfileRole || undefined;
}

async function enrichIdentity(
  userId: string,
  email?: string | null,
  allowVerifiedEmailFallback = false
): Promise<EnrichedIdentity> {
  try {
    const adminClient = getSupabaseServerClient();
    const profileFields = 'id, organization_id, role, full_name, first_name, last_name, status';

    const { data: profileById } = await adminClient
      .from('profiles')
      .select(profileFields)
      .eq('id', userId)
      .maybeSingle();

    let profile = profileById;
    let authUserId: string | undefined;
    const normalizedEmail = normalizeEmail(email);

    if (profileById) {
      const { data: reverseIdentityLink } = await adminClient
        .from('auth_profile_identity_links')
        .select('auth_user_id')
        .eq('profile_id', profileById.id)
        .maybeSingle();
      authUserId = reverseIdentityLink?.auth_user_id || undefined;
    }

    if (!profile) {
      const { data: identityLink } = await adminClient
        .from('auth_profile_identity_links')
        .select('profile_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (identityLink?.profile_id) {
        authUserId = userId;
        const { data: linkedProfile } = await adminClient
          .from('profiles')
          .select(profileFields)
          .eq('id', identityLink.profile_id)
          .maybeSingle();
        profile = linkedProfile;
      }
    }

    // Compatibility fallback for verified Supabase users created before MOTIL
    // standardized on shared Auth/profile UUIDs. Once resolved, persist the link.
    if (!profile && allowVerifiedEmailFallback && normalizedEmail) {
      const { data: legacyProfile } = await adminClient
        .from('profiles')
        .select(profileFields)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (legacyProfile) {
        profile = legacyProfile;
        authUserId = userId;
        await adminClient
          .from('auth_profile_identity_links')
          .upsert(
            {
              auth_user_id: userId,
              profile_id: legacyProfile.id,
              linked_email: normalizedEmail,
              link_reason: 'verified_email_runtime_bridge',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'auth_user_id' }
          );
      }
    }

    if (!profile) {
      return { authUserId, active: false };
    }

    const applicationUserId = profile.id;
    // MOTIL requires a canonical active application profile for every session.
    // A raw Supabase Auth identity is never sufficient by itself.
    if (profile.status !== 'active') {
      return { applicationUserId, authUserId, active: false };
    }

    let roleQuery = adminClient
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', applicationUserId)
      .order('created_at', { ascending: false });

    // An assigned role is only authoritative inside the same tenant as the
    // resolved application profile. This prevents a future multi-organization
    // membership from leaking an administrative role across organizations.
    if (profile?.organization_id) {
      roleQuery = roleQuery.eq('organization_id', profile.organization_id);
    }

    const { data: roleRows } = await roleQuery.limit(1);
    const roleRow = roleRows?.[0];
    return {
      applicationUserId,
      authUserId,
      organizationId: profile?.organization_id || roleRow?.organization_id || undefined,
      role: resolveEffectiveRole(profile?.role, roleRow?.role),
      fullName:
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
        undefined,
      active: true,
    };
  } catch {
    return {};
  }
}

async function resolveSupabaseAuth(request: NextRequest): Promise<AuthContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const identity = await enrichIdentity(
    user.id,
    user.email,
    Boolean(user.email_confirmed_at)
  );
  if (identity.active !== true || !identity.applicationUserId) return null;
  const applicationUserId = identity.applicationUserId;

  return {
    user: {
      id: applicationUserId,
      auth_user_id: user.id,
      email: user.email,
      full_name: identity.fullName,
      organization_id: identity.organizationId,
    },
    role: identity.role,
    organizationId: identity.organizationId,
    source: 'supabase',
  };
}

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const customSession = await verifyCustomSession(request.cookies.get('auth_token')?.value);

  if (customSession) {
    const identity = await enrichIdentity(
      customSession.user.id,
      customSession.user.email,
      true
    );
    if (identity.active !== true || !identity.applicationUserId) return null;
    const applicationUserId = identity.applicationUserId;
    const organizationId = identity.organizationId || customSession.user.organization_id || undefined;
    const role = identity.role || customSession.role || undefined;

    return {
      user: {
        id: applicationUserId,
        auth_user_id: identity.authUserId,
        email: customSession.user.email,
        full_name: identity.fullName || customSession.user.full_name || undefined,
        organization_id: organizationId,
      },
      role,
      organizationId,
      source: 'custom-cookie',
    };
  }

  return resolveSupabaseAuth(request);
}
