export interface JwtPayload {
  sub: string;
  workspaceId: string;
  role: string;
  workspaceType: string;
  deviceId: string;
  iat: number;
  exp: number;
}

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
}

export interface Workspace {
  id: string;
  type: 'PERSONAL' | 'COMPANY';
  name: string;
}

export interface WorkspaceWithRole {
  workspace: Workspace;
  role: { code: string; name: string };
}

// Matches GET /auth/workspaces response format (flat)
export interface WorkspaceItem {
  id: string;
  type: 'PERSONAL' | 'COMPANY';
  name: string;
  role: string; // role code: 'OWNER' | 'ADMIN' | ...
  is_active: boolean;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  invitedPhone: string;
  invitedByUserId: string;
  roleId: string;
  token: string;
  status: number; // 0=pending, 1=accepted, 2=declined, 3=expired, 4=cancelled
  expiresAt: string;
  respondedAt: string | null;
  workspace: Workspace;
  role: { id: string; code: string; name: string };
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  SALES: 'Kinh doanh',
  PARTNER: 'Đối tác',
};

export const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-violet-100 text-violet-700',
  MANAGER: 'bg-orange-100 text-orange-700',
  SALES: 'bg-green-100 text-green-700',
  PARTNER: 'bg-yellow-100 text-yellow-700',
};
