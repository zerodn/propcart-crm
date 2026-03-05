# Hướng Dẫn Sử Dụng Hệ Thống Đa Ngôn Ngữ (i18n)

## Tổng Quan

Hệ thống i18n được tổ chức như sau:

```
apps/web/src/
├── locales/
│   ├── vi.json     # Tiếng Việt
│   └── en.json     # English
├── lib/
│   └── i18n.ts     # Import và export translations
└── providers/
    └── i18n-provider.tsx  # Context provider với hook useI18n
```

## Cấu Trúc Translation Files

### `apps/web/src/locales/vi.json` và `en.json`

Các file JSON được tổ chức theo module/feature:

```json
{
  "common": {
    "save": "Lưu",
    "cancel": "Hủy",
    "loading": "Đang tải..."
  },
  "auth": {
    "login": {
      "title": "Đăng nhập",
      "welcomeBack": "Chào mừng trở lại"
    }
  },
  "profile": {
    "title": "Hồ sơ",
    "documents": {
      "title": "Tài liệu",
      "types": {
        "CCCD": "CCCD/CMND"
      }
    }
  }
}
```

**Nguyên tắc đặt tên key:**
- Dùng camelCase cho keys
- Tổ chức theo cấu trúc module > feature > specific key
- Keys phải giống nhau giữa `vi.json` và `en.json`

## Cách Sử Dụng Trong Components

### 1. Import Hook

```tsx
import { useI18n } from '@/providers/i18n-provider';
```

### 2. Sử Dụng Hook Trong Component

```tsx
export function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  
  return (
    <div>
      <h1>{t('profile.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 3. Translation Với Variables (Interpolation)

Nếu text có biến động (như tên user, số lượng):

**Translation file:**
```json
{
  "workspace": {
    "switchSuccess": "Đã chuyển sang workspace \"{name}\"",
    "daysLeft": "Còn {days} ngày"
  }
}
```

**Component:**
```tsx
toast.success(t('workspace.switchSuccess', { name: workspaceName }));
// Output: "Đã chuyển sang workspace "My Workspace""

<span>{t('invitations.daysLeft', { days: 3 })}</span>
// Output: "Còn 3 ngày"
```

## Examples Đã Implement

### ✅ Auth Provider

```tsx
import { useI18n } from './i18n-provider';

export function AuthProvider({ children }) {
  const { t } = useI18n();
  
  const switchWorkspace = async (workspaceId) => {
    try {
      // ...
      toast.success(t('workspace.switchSuccess', { name: workspace.name }));
    } catch {
      toast.error(t('workspace.switchError'));
    }
  };
}
```

### ✅ Invitation Card

```tsx
import { useI18n } from '@/providers/i18n-provider';

export function InvitationCard({ invitation }) {
  const { t } = useI18n();
  
  return (
    <div>
      <button>{t('invitations.accept')}</button>
      <button>{t('invitations.decline')}</button>
      <textarea placeholder={t('invitations.declineReasonPlaceholder')} />
      {isExpired ? t('invitations.expired') : t('invitations.daysLeft', { days: daysLeft })}
    </div>
  );
}
```

### ✅ Workspace Switcher

```tsx
import { useI18n } from '@/providers/i18n-provider';

export function WorkspaceSwitcher() {
  const { t } = useI18n();
  
  return (
    <div>
      <p>{t('workspace.title')}</p>
      {isCurrentWorkspace && <span>{t('common.current')}</span>}
    </div>
  );
}
```

## Hướng Dẫn Migrate Components Chưa I18n

### Bước 1: Identify Hardcoded Text

Tìm tất cả text tiếng Việt hardcoded trong component:

```tsx
// ❌ Before
<button>Lưu thông tin</button>
<p>Đang tải...</p>
toast.success('Đã cập nhật thành công');
```

### Bước 2: Add Keys Vào Translation Files

Thêm vào `vi.json`:
```json
{
  "myModule": {
    "saveInfo": "Lưu thông tin",
    "loading": "Đang tải...",
    "updateSuccess": "Đã cập nhật thành công"
  }
}
```

Thêm vào `en.json`:
```json
{
  "myModule": {
    "saveInfo": "Save information",
    "loading": "Loading...",
    "updateSuccess": "Updated successfully"
  }
}
```

### Bước 3: Update Component

```tsx
// ✅ After
import { useI18n } from '@/providers/i18n-provider';

export function MyComponent() {
  const { t } = useI18n();
  
  return (
    <>
      <button>{t('myModule.saveInfo')}</button>
      <p>{t('myModule.loading')}</p>
      {/* In function */}
      toast.success(t('myModule.updateSuccess'));
    </>
  );
}
```

## Components Còn Cần Migrate

### Profile Page
File: `apps/web/src/app/(protected)/profile/page.tsx`

**Hardcoded text cần extract:**
- "Ho so ca nhan", "Cap nhat thong tin"
- "So dien thoai", "Ten", "Email"
- "Dia chi day du", "Tinh/Thanh pho", "Phuong/Xa"
- "Luu thong tin"
- "Tai lieu lien quan"
- "Tai len", "Loc theo loai"
- "Chua co tai lieu nao duoc tai len"

**Translation path suggestions:**
```json
{
  "profile": {
    "title": "Hồ sơ cá nhân",
    "subtitle": "Cập nhật thông tin của bạn và xác thực email",
    "phone": "Số điện thoại",
    "name": "Tên",
    "email": "Email",
    "address": "Địa chỉ đầy đủ",
    "province": "Tỉnh/Thành phố",
    "ward": "Phường/Xã",
    "save": "Lưu thông tin",
    "documents": {
      "title": "Tài liệu liên quan",
      "upload": "Tải lên",
      "filterByType": "Lọc theo loại",
      "noDocuments": "Chưa có tài liệu nào được tải lên"
    }
  }
}
```

### Department Components
Files:
- `apps/web/src/components/department/department-form.tsx`
- `apps/web/src/components/department/department-members-dialog.tsx`
- `apps/web/src/app/(protected)/departments/page.tsx`

**Translation suggestions:**
```json
{
  "departments": {
    "title": "Phòng ban",
    "create": "Tạo phòng ban",
    "name": "Tên phòng ban",
    "code": "Mã phòng ban",
    "description": "Mô tả",
    "members": "Nhân sự",
    "addMember": "Thêm nhân sự",
    "selectMember": "Chọn nhân sự",
    "selectRole": "Chọn vai trò",
    "searchMember": "Tìm kiếm nhân sự..."
  }
}
```

### Catalog Components
File: `apps/web/src/components/catalog/catalog-form.tsx`

**Translation suggestions:**
```json
{
  "catalogs": {
    "title": "Danh mục",
    "create": "Tạo danh mục",
    "name": "Tên danh mục",
    "code": "Mã danh mục",
    "type": "Loại",
    "parent": "Danh mục cha",
    "values": "Giá trị",
    "manageValues": "Quản lý giá trị"
  }
}
```

## Chuyển Đổi Ngôn Ngữ (Language Switcher)

Để thêm nút chuyển đổi ngôn ngữ trong header:

```tsx
import { useI18n } from '@/providers/i18n-provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  
  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value as 'vi' | 'en')}
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
```

## Best Practices

### ✅ DO:
- Group related translations together (e.g., all button labels under `common`)
- Use meaningful key names that describe the content
- Keep translations in sync between `vi.json` and `en.json`
- Use interpolation for dynamic content
- Extract all UI-visible text to translation files

### ❌ DON'T:
- Hardcode text directly in JSX
- Use abbreviations or cryptic key names
- Duplicate same translations across different keys
- Put logic or HTML in translation strings
- Mix languages in the same translation file

## Testing

Sau khi migrate, test bằng cách:

1. Chuyển đổi ngôn ngữ trong localStorage:
```js
localStorage.setItem('locale', 'en');
// Reload page
```

2. Verify tất cả text đều thay đổi tương ứng

3. Check không có missing keys (component sẽ hiển thị empty string nếu key không tồn tại)

## Status Hiện Tại

### ✅ Đã Implement:
- ✅ Translation files structure (vi.json, en.json)
- ✅ i18n Provider với interpolation support
- ✅ Auth Provider (workspace switch messages)
- ✅ Invitation Card (full)
- ✅ Workspace Switcher

### ⏳ Cần Migrate:
- Profile Page (518 lines, nhiều form fields)
- Department components
- Catalog components
- Members page
- Notifications page
- Login/Auth forms

## References

- Translation files: `apps/web/src/locales/`
- Provider: `apps/web/src/providers/i18n-provider.tsx`
- Example components: See sections above
