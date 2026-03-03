'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setTokens, clearTokens, getAccessToken, decodeJwt, isTokenExpired, setWorkspaceName, getWorkspaceName } from '@/lib/auth';
import apiClient from '@/lib/api-client';
import type { User, Workspace } from '@/types';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    workspace: null,
    role: null,
    workspaceType: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = getAccessToken();
    if (token && !isTokenExpired(token)) {
      const payload = decodeJwt(token);
      if (payload) {
        // Re-set cookie in case it expired while localStorage token is still valid
        document.cookie = `access_token=${token}; path=/; max-age=900; SameSite=Strict`;
        setState({
          user: { id: payload.sub, phone: null, email: null },
          workspace: { id: payload.workspaceId, type: payload.workspaceType as 'PERSONAL' | 'COMPANY', name: getWorkspaceName() || '' },
          role: payload.role,
          workspaceType: payload.workspaceType,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const login = useCallback(
    (accessToken: string, refreshToken: string, user: User, workspace: Workspace) => {
      setTokens(accessToken, refreshToken);
      setWorkspaceName(workspace.name);
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
      const { getRefreshToken } = await import('@/lib/auth');
      const rt = getRefreshToken();
      if (rt) await apiClient.post('/auth/logout', { refresh_token: rt });
    } catch {
      // ignore errors on logout
    } finally {
      clearTokens();
      setState({ user: null, workspace: null, role: null, workspaceType: null, isAuthenticated: false, isLoading: false });
      router.push('/login');
    }
  }, [router]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        const { data } = await apiClient.post('/auth/switch-workspace', { workspace_id: workspaceId });
        const { access_token, refresh_token, workspace } = data.data;
        const payload = decodeJwt(access_token);
        setTokens(access_token, refresh_token);
        setWorkspaceName(workspace.name);
        setState((s) => ({
          ...s,
          workspace,
          role: payload?.role ?? s.role,
          workspaceType: payload?.workspaceType ?? s.workspaceType,
        }));
        toast.success(`Đã chuyển sang workspace "${workspace.name}"`);
        router.refresh();
      } catch {
        toast.error('Không thể chuyển workspace');
      }
    },
    [router],
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchWorkspace }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
