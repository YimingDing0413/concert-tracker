/**
 * Sanitize a post-login redirect. Only same-app relative paths are allowed.
 */
export function sanitizeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  const trimmed = decoded.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('://')) return fallback;
  if (trimmed.toLowerCase().startsWith('/login') || trimmed.toLowerCase().startsWith('/signup')) {
    return fallback;
  }
  return trimmed;
}

export function loginPathWithNext(next: string): string {
  const safe = sanitizeNextPath(next, '/');
  return `/login?next=${encodeURIComponent(safe)}`;
}

export function signupPathWithNext(next: string): string {
  const safe = sanitizeNextPath(next, '/');
  return `/signup?next=${encodeURIComponent(safe)}`;
}

/** True when the intended destination is the Log flow. */
export function isLogNextPath(next: string): boolean {
  const path = sanitizeNextPath(next, '').split('?')[0] ?? '';
  return path === '/log' || path === '/add';
}
