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
  fullName?: string | null;
  addressLine?: string | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  districtCode?: string | null;
  districtName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  emailVerifiedAt?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
}

export interface UserDocument {
  id: string;
  documentType: 'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER';
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  type: 'PERSONAL' | 'COMPANY';
  name: string;
  requireKyc?: boolean;
  kycStatus?: 'NONE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
  kycRejectionReason?: string | null;
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
  code: string | null;
  address: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  requireKyc: boolean;
  kycStatus?: 'NONE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
  role: string; // role code: 'OWNER' | 'ADMIN' | ...
  is_active: boolean;
}

// Workspace search result (public workspaces)
export interface WorkspaceSearchResult {
  id: string;
  type: 'PERSONAL' | 'COMPANY';
  name: string;
  code: string | null;
  address: string | null;
  logoUrl: string | null;
  requireKyc?: boolean;
}

// Join request document
export interface JoinRequestDocument {
  id: string;
  requestId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

// Join request (user-side view)
export interface JoinRequest {
  id: string;
  workspaceId: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  message: string | null;
  rejectionReason: string | null;
  requestedRole: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  wardCode: string | null;
  wardName: string | null;
  addressLine: string | null;
  reviewedAt: string | null;
  createdAt: string;
  workspace: WorkspaceSearchResult;
  documents: JoinRequestDocument[];
}

// Join request (admin-side view includes user info)
export interface JoinRequestAdmin extends Omit<JoinRequest, 'workspace'> {
  user: {
    id: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  reviewer: { id: string; fullName: string | null } | null;
  rejectionHistory: {
    id: string;
    reason: string | null;
    rejectedAt: string;
    reviewer: { id: string; fullName: string | null };
  }[];
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
  declineReason?: string | null;
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
  OWNER: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  ADMIN: 'bg-violet-100 text-violet-700',
  MANAGER: 'bg-orange-100 text-orange-700',
  SALES: 'bg-green-100 text-green-700',
  PARTNER: 'bg-yellow-100 text-yellow-700',
};

export const CATALOG_TYPES: Record<string, string> = {
  PROPERTY_TYPE: 'Loại hình bất động sản',
  PROPERTY_DIRECTION: 'Hướng BĐS',
  PROPERTY_TRANSACTION_STATUS: 'Trạng thái giao dịch BĐS',
  PRODUCT_TAG: 'Nhãn sản phẩm',
  PROPERTY_STATUS: 'Trạng thái bất động sản',
  LISTING_TYPE: 'Loại danh sách',
  PAYMENT_METHOD: 'Phương thức thanh toán',
  AMENITY: 'Tiện nghi',
  DISTRICT: 'Quận/Huyện',
  CITY: 'Thành phố/Tỉnh',
  // Customer
  CUSTOMER_STATUS: 'Trạng thái khách hàng',
  CUSTOMER_SOURCE: 'Nguồn khách hàng',
  CUSTOMER_GROUP: 'Nhóm khách hàng',
  CUSTOMER_INTEREST_LEVEL: 'Mức độ quan tâm',
  CUSTOMER_TITLE: 'Danh xưng khách hàng',
  ACTIVITY_TYPE: 'Loại tác vụ hoạt động',
};

// Maps each catalog type to the menu(s) that use it — for the eye-icon usage indicator in /catalog
export const CATALOG_USAGE_MAP: Record<string, { label: string; path: string }[]> = {
  PROPERTY_TYPE:              [{ label: 'Bất động sản', path: '/real-estate' }, { label: 'Dự án', path: '/projects' }],
  PROPERTY_DIRECTION:         [{ label: 'Bất động sản', path: '/real-estate' }],
  PROPERTY_TRANSACTION_STATUS:[{ label: 'Bất động sản', path: '/real-estate' }],
  PROPERTY_STATUS:            [{ label: 'Bất động sản', path: '/real-estate' }],
  PRODUCT_TAG:                [{ label: 'Sản phẩm', path: '/products' }],
  LISTING_TYPE:               [{ label: 'Bất động sản', path: '/real-estate' }],
  PAYMENT_METHOD:             [{ label: 'Thanh toán', path: '/payments' }],
  AMENITY:                    [{ label: 'Bất động sản', path: '/real-estate' }, { label: 'Dự án', path: '/projects' }],
  DISTRICT:                   [{ label: 'Bất động sản', path: '/real-estate' }, { label: 'Khách hàng', path: '/customer' }],
  CITY:                       [{ label: 'Bất động sản', path: '/real-estate' }, { label: 'Khách hàng', path: '/customer' }],
  CUSTOMER_STATUS:            [{ label: 'Khách hàng', path: '/customer' }],
  CUSTOMER_SOURCE:            [{ label: 'Khách hàng', path: '/customer' }],
  CUSTOMER_GROUP:             [{ label: 'Khách hàng', path: '/customer' }],
  CUSTOMER_INTEREST_LEVEL:    [{ label: 'Khách hàng', path: '/customer' }],
  CUSTOMER_TITLE:             [{ label: 'Khách hàng', path: '/customer' }],
  ACTIVITY_TYPE:              [{ label: 'Lịch sử CSKH (Khách hàng)', path: '/customer' }],
};
