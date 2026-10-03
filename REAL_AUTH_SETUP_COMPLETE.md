# MOTIL authentication architecture

This document supersedes an early setup note that described a temporary demo authentication mode.

## Current model

MOTIL uses two interoperable server-validated identity paths while historical accounts are migrated:

1. Supabase Auth sessions, resolved to canonical MOTIL profiles.
2. Signed MOTIL compatibility sessions for legacy profiles.

Both paths resolve the active canonical profile, organization and effective role before protected API access is granted.

## Identity linkage

Historical application profiles can be linked to Supabase Auth identities through `auth_profile_identity_links`. Verified-email fallback exists only as a migration bridge and persists an explicit identity link when resolved.

## User provisioning

Public self-registration is disabled. Organization administrators create users through the authenticated Administration > Users workflow. Provisioning must preserve organization scope and must never embed credentials in source control.

## Security properties

- Passwords are required and validated.
- Unsigned compatibility cookies are rejected.
- Inactive profiles are denied.
- Protected API routes require authenticated context.
- Module permissions are resolved from canonical role/cargo access.
- Repository CI scans for obvious plaintext credentials.
- Service-role secrets remain server-side only.

## Operational rule

Do not use historical setup files, screenshots or commits as current authentication instructions. Validate behavior against the deployed SHA, current source and canonical Supabase state.
