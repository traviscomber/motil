export interface AuthCookieUser {
  id: string;
  email?: string;
  full_name?: string;
  organization_id?: string;
}

export interface AuthCookiePayload {
  user: AuthCookieUser;
  role?: string;
  session_token: string;
  issued_at: number;
  expires_at: number;
  version: 1;
}

const AUTH_COOKIE_VERSION = 1;
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAuthCookieSecret() {
  return (
    process.env.AUTH_COOKIE_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function importHmacKey(secret: string) {
  return globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isAuthCookiePayload(value: unknown): value is AuthCookiePayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Partial<AuthCookiePayload>;

  return (
    payload.version === AUTH_COOKIE_VERSION &&
    typeof payload.session_token === 'string' &&
    typeof payload.issued_at === 'number' &&
    typeof payload.expires_at === 'number' &&
    !!payload.user?.id
  );
}

export function buildAuthCookiePayload(input: {
  user: AuthCookieUser;
  role?: string;
  sessionToken: string;
  maxAgeSeconds?: number;
}): AuthCookiePayload {
  const now = Date.now();

  return {
    user: input.user,
    role: input.role,
    session_token: input.sessionToken,
    issued_at: now,
    expires_at: now + (input.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS) * 1000,
    version: AUTH_COOKIE_VERSION,
  };
}

export async function createAuthCookieValue(payload: AuthCookiePayload) {
  const secret = getAuthCookieSecret();
  if (!secret) {
    throw new Error('Missing auth cookie signing secret');
  }

  const json = JSON.stringify(payload);
  const data = new TextEncoder().encode(json);
  const key = await importHmacKey(secret);
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, data);

  return `${toBase64Url(data)}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthCookieValue(token?: string | null) {
  if (!token) return null;

  const secret = getAuthCookieSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const payloadBytes = fromBase64Url(encodedPayload);
    const signatureBytes = fromBase64Url(encodedSignature);
    const key = await importHmacKey(secret);
    const valid = await globalThis.crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes);

    if (!valid) return null;

    const parsed = safeJsonParse<unknown>(new TextDecoder().decode(payloadBytes));
    if (!isAuthCookiePayload(parsed)) return null;

    if (parsed.expires_at <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
