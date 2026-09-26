import { getDictionaryForRequest } from '@/lib/i18n/server';
import { LoginPage } from '@/components/auth/login-page';

// Authentication pages must never be served from a stale prerender/cache entry.
// Login behavior, session cookies and CSP are security-sensitive and must always
// reflect the currently deployed application version.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuthLoginPage() {
  const { dictionary } = await getDictionaryForRequest();
  return <LoginPage dictionary={dictionary} />;
}
