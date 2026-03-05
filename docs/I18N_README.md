# PropCart CRM — Hệ Thống Đa Ngôn Ngữ (i18n)

## Tổng Quan

Hệ thống hỗ trợ **Tiếng Việt (vi)** và **English (en)** với khả năng dễ dàng mở rộng thêm ngôn ngữ khác.

## Cấu Trúc

```
apps/web/src/
├── locales/
│   ├── vi.json          # Tiếng Việt
│   └── en.json          # English
├── lib/
│   └── i18n.ts          # Export translations
└── providers/
    └── i18n-provider.tsx # Context provider
```

## Cách Sử Dụng

### 1. Basic Usage

```tsx
import { useI18n } from '@/providers/i18n-provider';

function MyComponent() {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('profile.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 2. Variables (Interpolation)

```tsx
// Translation
{
  "workspace": {
    "switchSuccess": "Đã chuyển sang workspace \"{name}\""
  }
}

// Component
toast.success(t('workspace.switchSuccess', { name: 'My Workspace' }));
// Output: "Đã chuyển sang workspace "My Workspace""
```

### 3. Chuyển Đổi Ngôn Ngữ

```tsx
function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  
  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
```

## Modules Đã Có Translation

### ✅ common
`save`, `cancel`, `delete`, `loading`, `upload`, `download`, etc.

### ✅ auth
`login.title`, `login.sendOtp`, `errors.invalidPhone`, etc.

### ✅ workspace
`title`, `switchSuccess`, `switchError`

### ✅ invitations
`accept`, `decline`, `expired`, `daysLeft`

### ✅ profile
`title`, `email`, `documents.title`, `documents.types.*`

### ✅ departments
`title`, `create`, `members`, `addMember`

### ✅ catalogs
`title`, `create`, `name`, `code`, `values`

### ✅ notifications
`title`, `markAsRead`, `noNotifications`

### ✅ roles
`OWNER`, `ADMIN`, `MANAGER`, `SALES`, `VIEWER`

## Thêm Translation Mới

### 1. Thêm vào `vi.json` và `en.json`

```json
// vi.json
{
  "myModule": {
    "myKey": "Nội dung tiếng Việt"
  }
}

// en.json
{
  "myModule": {
    "myKey": "English content"
  }
}
```

### 2. Sử dụng trong component

```tsx
const { t } = useI18n();
<span>{t('myModule.myKey')}</span>
```

## Ngôn Ngữ Mặc Định

- **SSR/CSR First Render:** `vi` (Tiếng Việt)
- **Sau khi mount:** Đọc từ `localStorage.getItem('locale')`
- **Khi chuyển ngôn ngữ:** Lưu vào `localStorage.setItem('locale', newLocale)`

## Documentation

Chi tiết migration guide: [docs/I18N_GUIDE.md](./I18N_GUIDE.md)

## Components Đã Migrate

- ✅ AuthProvider
- ✅ InvitationCard
- ✅ WorkspaceSwitcher
- ⏳ ProfilePage (partial)
- ⏳ Departments
- ⏳ Catalogs
- ⏳ Members
