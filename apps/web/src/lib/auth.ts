import { jwtDecode } from 'jwt-decode';
import type { JwtPayload } from '@/types';

const ACCESS_TOKEN_KEY = 'pc_access_token';
const REFRESH_TOKEN_KEY = 'pc_refresh_token';
const DEVICE_HASH_KEY = 'pc_device_hash';
const WORKSPACE_NAME_KEY = 'pc_workspace_name';

export function getDeviceHash(): string {
  if (typeof window === 'undefined') return 'server';
  let hash = localStorage.getItem(DEVICE_HASH_KEY);
  if (!hash) {
    hash = crypto.randomUUID();
    localStorage.setItem(DEVICE_HASH_KEY, hash);
  }
  return hash;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // Keep middleware cookie longer so route navigation is not interrupted.
  // API calls still enforce JWT expiry and refresh flow via interceptors.
  document.cookie = `access_token=${accessToken}; path=/; max-age=604800; SameSite=Strict`;
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(WORKSPACE_NAME_KEY);
  document.cookie = 'access_token=; path=/; max-age=0';
}

export function setWorkspaceName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORKSPACE_NAME_KEY, name);
}

export function getWorkspaceName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WORKSPACE_NAME_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  // primary source is localStorage (populated after login)
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) return token;

  // quick dev helper: if a token is provided via the query string we store
  // it locally and drop the parameter. This is handy for scripts that
  // launch the app with a token (e.g. lighthouse-auth.js) without needing
  // to manipulate localStorage directly.
  try {
    const url = new URL(window.location.href);
    const qsToken = url.searchParams.get('lh_token') || url.searchParams.get('access_token');
    if (qsToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, qsToken);
      document.cookie = `access_token=${qsToken}; path=/; max-age=604800; SameSite=Strict`;
      url.searchParams.delete('lh_token');
      url.searchParams.delete('access_token');
      window.history.replaceState(null, '', url.toString());
      return qsToken;
    }
  } catch {
    // ignore malformed URLs
  }

  // fallback to cookie (useful for SSR or external scripts that only send a cookie)
  const match = document.cookie.match(/(?:^|;\\s*)access_token=([^;]+)/);
  return match ? match[1] : null;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  return payload.exp * 1000 < Date.now();
}
