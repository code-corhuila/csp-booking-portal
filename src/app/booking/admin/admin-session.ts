/** Where the shell keeps the session token (csp-front, SessionService). */
export const SESSION_TOKEN_KEY = 'csp.session.token';

function payloadOf(token: string): unknown {
  const body = token.split('.')[1];
  if (!body) return null;
  try {
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

/**
 * Whether the token claims the ADMIN role. The token is only read, never verified: this decides what the
 * portal shows. Who may read what is decided by the API, which validates the signature and the permission.
 */
export function isAdminToken(token: string | null): boolean {
  if (!token) return false;
  const roles = (payloadOf(token) as { roles?: unknown } | null)?.roles;
  return Array.isArray(roles) && roles.includes('ADMIN');
}

/** The current session token, or null when there is none or the storage cannot be read. */
export function sessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}
