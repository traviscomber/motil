// Legacy helper retired for security.
// Password changes must use the approved authentication administration flow.
// Do not store or print credentials in repository scripts.
//
// For emergency credential rotation, use Supabase Auth administration with
// credentials supplied outside the repository and revoke prior sessions.
// See UPDATE-USER-PASSWORD.md for the current procedure.

console.error('This legacy credential helper is retired. Use the approved Auth administration flow.');
process.exit(1);
