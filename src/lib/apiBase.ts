import { Capacitor } from '@capacitor/core';

/** Production API used when the app runs inside the native shell (Capacitor). */
const NATIVE_DEFAULT_API = 'https://concert-tracker-mauve.vercel.app';

/**
 * Web dev uses relative `/api` (Vite proxy). Native app has no local API server,
 * so requests go to the deployed Vercel backend.
 */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Capacitor.isNativePlatform()) return NATIVE_DEFAULT_API;
  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
