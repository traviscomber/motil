// Legacy role-specific provisioning helper retired.
// Use scripts/create-user.mjs with an explicit email, full name and role.
// Required secrets and organization scope must be supplied through local,
// non-versioned environment variables.

console.error('Use scripts/create-user.mjs with MOTIL_INITIAL_PASSWORD and MOTIL_ORGANIZATION_ID set locally.');
process.exit(1);
