'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from './i18n-provider';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getDeviceHash,
  decodeJwt,
  isTokenExpired,
  setWorkspaceName,
  getWorkspaceName,
} from '@/lib/auth';
import apiClient from '@/lib/api-client';
import type { User, Workspace } from '@/types';

// useLayoutEffect on client (runs before paint), useEffect on server (SSR compat).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  role: string | null;
  workspaceType: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, user: User, workspace: Workspace) => void;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateWorkspaceName: (workspaceId: string, name: string) => void;
  updateWorkspaceKyc: (kycStatus: Workspace['kycStatus']) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeNullableText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  // `localCheckDone` flips to true after the synchronous localStorage check,
  // triggering the async refresh useEffect below.
  const [localCheckDone, setLocalCheckDone] = useState(false);
  const refreshAttemptedRef = useRef(false);
  const [state, setState] = useState<AuthState>({
    user: null,
    workspace: null,
    role: null,
    workspaceType: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Phase 1 (sync, before paint): check for a valid token in localStorage.
  // If found, authenticate immediately so the page renders without a spinner.
  // If NOT found (missing or expired), leave isLoading:true and let Phase 2 run.
  useIsomorphicLayoutEffect(() => {
    const token = getAccessToken();
    if (token && !isTokenExpired(token)) {
      const payload = decodeJwt(token);
      if (payload) {
        document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Strict`;
        setState({
          user: {
            id: payload.sub,
            phone: null,
            email: null,
            fullName: null,
            addressLine: null,
            provinceCode: null,
            provinceName: null,
            districtCode: null,
            districtName: null,
            wardCode: null,
            wardName: null,
            emailVerifiedAt: null,
          },
          workspace: {
            id: payload.workspaceId,
            type: payload.workspaceType as 'PERSONAL' | 'COMPANY',
            name: getWorkspaceName() || '',
          },
          role: payload.role,
          workspaceType: payload.workspaceType,
          isAuthenticated: true,
          isLoading: false,
        });
        setLocalCheckDone(true);
        return;
      }
    }
    // No valid local token — trigger Phase 2 (async refresh attempt).
    setLocalCheckDone(true);
  }, []);

  // Phase 2 (async): when Phase 1 found no valid token, try silently refreshing
  // using the refresh token stored in localStorage.  This prevents users from
  // being sent to /login just because the 15-min access token expired while they
  // still have a valid 7-day refresh token.
  useEffect(() => {
    if (!localCheckDone) return;
    if (state.isAuthenticated) return; // Phase 1 already succeeded
    if (refreshAttemptedRef.current) return; // guard against effect re-runs
    refreshAttemptedRef.current = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      // No refresh token at all → not authenticated.
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const deviceHash = getDeviceHash();

    fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, device_hash: deviceHash }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('refresh_failed');
        return res.json();
      })
      .then((data: { data?: { accessToken?: string; access_token?: string; refreshToken?: string; refresh_token?: string }; accessToken?: string; refreshToken?: string }) => {
        const newAccess =
          data.data?.accessToken ?? data.data?.access_token ?? data.accessToken;
        const newRefresh =
          data.data?.refreshToken ?? data.data?.refresh_token ?? data.refreshToken;
        if (!newAccess || !newRefresh) throw new Error('bad_response');

        setTokens(newAccess, newRefresh);
        const payload = decodeJwt(newAccess);
        if (!payload) throw new Error('bad_token');

        document.cookie = `access_token=${newAccess}; path=/; max-age=604800; SameSite=Strict`;
        setState({
          user: {
            id: payload.sub,
            phone: null,
            email: null,
            fullName: null,
            addressLine: null,
            provinceCode: null,
            provinceName: null,
            districtCode: null,
            districtName: null,
            wardCode: null,
            wardName: null,
            emailVerifiedAt: null,
          },
          workspace: {
            id: payload.workspaceId,
            type: payload.workspaceType as 'PERSONAL' | 'COMPANY',
            name: getWorkspaceName() || '',
          },
          role: payload.role,
          workspaceType: payload.workspaceType,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch(() => {
        // Refresh failed (revoked token, network error, etc.) → go to login.
        clearTokens();
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, [localCheckDone, state.isAuthenticated]);

  const login = useCallback(
    (accessToken: string, refreshToken: string, user: User, workspace: Workspace) => {
      setTokens(accessToken, refreshToken);
      setWorkspaceName(workspace.name);
      hasRefreshedRef.current = false;
      const payload = decodeJwt(accessToken);
      setState({
        user,
        workspace,
        role: payload?.role ?? null,
        workspaceType: payload?.workspaceType ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const rt = getRefreshToken();
      if (rt) await apiClient.post('/auth/logout', { refresh_token: rt });
    } catch {
      // ignore errors on logout
    } finally {
      clearTokens();
      hasRefreshedRef.current = false;
      setState({
        user: null,
        workspace: null,
        role: null,
        workspaceType: null,
        isAuthenticated: false,
        isLoading: false,
      });
      router.push('/login');
    }
  }, [router]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        const { data } = await apiClient.post('/auth/switch-workspace', {
          workspace_id: workspaceId,
        });
        const { access_token, refresh_token, workspace, requireKyc, kycStatus, kycRejectionReason } = data.data;
        const payload = decodeJwt(access_token);
        setTokens(access_token, refresh_token);
        setWorkspaceName(workspace.name);
        setState((s) => ({
          ...s,
          workspace: { ...workspace, requireKyc, kycStatus: kycStatus ?? 'NONE', kycRejectionReason: kycRejectionReason ?? null },
          role: payload?.role ?? s.role,
          workspaceType: payload?.workspaceType ?? s.workspaceType,
        }));
        toast.success(t('workspace.switchSuccess', { name: workspace.name }));
        // Navigate to dashboard so server components fetch fresh data for the new
        // workspace. Using push (not refresh) avoids concurrent-mode races where
        // router.refresh() can re-render LayoutInner before the setState above is
        // committed, causing workspace.requireKyc to appear undefined and the KYC
        // gate not to show.
        router.push('/dashboard');
      } catch {
        toast.error(t('workspace.switchError'));
      }
    },
    [router],
  );

  const updateWorkspaceName = useCallback((workspaceId: string, name: string) => {
    setState((s) => {
      if (s.workspace?.id !== workspaceId) return s;
      setWorkspaceName(name);
      return { ...s, workspace: { ...s.workspace, name } };
    });
  }, []);

  const updateWorkspaceKyc = useCallback((kycStatus: Workspace['kycStatus']) => {
    setState((s) => {
      if (!s.workspace) return s;
      return { ...s, workspace: { ...s.workspace, kycStatus } };
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const [profileRes, workspacesRes] = await Promise.all([
        apiClient.get('/me/profile'),
        apiClient.get('/auth/workspaces'),
      ]);
      const profile = profileRes.data?.data;
      if (!profile) return;

      // Sync workspace data from server (prevents stale data from localStorage/JWT)
      const workspacesList: Array<{
        id: string;
        name: string;
        type: string;
        requireKyc?: boolean;
        kycStatus?: string | null;
      }> = workspacesRes.data?.data ?? [];
      setState((s) => {
        const freshWs = workspacesList.find((w) => w.id === s.workspace?.id);
        if (freshWs && freshWs.name !== s.workspace?.name) {
          setWorkspaceName(freshWs.name);
        }
        return {
          ...s,
          workspace:
            freshWs && s.workspace
              ? {
                  ...s.workspace,
                  name: freshWs.name,
                  requireKyc: freshWs.requireKyc,
                  kycStatus: (freshWs.kycStatus ?? 'NONE') as Workspace['kycStatus'],
                }
              : s.workspace,
          user: {
            id: profile.id,
            phone: normalizeNullableText(profile.phone),
            email: normalizeNullableText(profile.email),
            fullName: normalizeNullableText(profile.fullName),
            addressLine: normalizeNullableText(profile.addressLine),
            provinceCode: normalizeNullableText(profile.provinceCode),
            provinceName: normalizeNullableText(profile.provinceName),
            districtCode: normalizeNullableText(profile.districtCode),
            districtName: normalizeNullableText(profile.districtName),
            wardCode: normalizeNullableText(profile.wardCode),
            wardName: normalizeNullableText(profile.wardName),
            emailVerifiedAt: profile.emailVerifiedAt ?? null,
            avatarUrl: profile.avatarUrl ?? null,
          },
        };
      });
    } catch {
      // Silent fail because this is a non-critical state refresh.
    }
  }, []);

  // Run once when auth is ready — always fetch fresh user + workspace data from server
  const hasRefreshedRef = useRef(false);
  useEffect(() => {
    if (!state.isAuthenticated) return;
    if (state.isLoading) return;
    if (hasRefreshedRef.current) return;
    hasRefreshedRef.current = true;
    void refreshProfile();
  }, [refreshProfile, state.isAuthenticated, state.isLoading]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchWorkspace, refreshProfile, updateWorkspaceName, updateWorkspaceKyc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
