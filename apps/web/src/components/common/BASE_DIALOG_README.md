# BaseDialog Component

Component dialog chuẩn cho toàn bộ hệ thống với cấu trúc 3 vùng: Header, Content, Footer.

## Đặc điểm

- ✅ Header cố định với title và icon X đóng dialog
- ✅ Content scrollable khi nội dung dài
- ✅ Footer cố định chứa action buttons (optional)
- ✅ Chiều cao header/footer đồng nhất trong toàn hệ thống
- ✅ Hỗ trợ ESC key để đóng dialog
- ✅ Lock body scroll khi dialog mở
- ✅ Responsive với maxWidth options

## Props

```typescript
interface BaseDialogProps {
  isOpen: boolean;              // Dialog có đang mở không
  onClose: () => void;           // Callback khi đóng dialog
  title: string;                 // Tiêu đề header
  children: ReactNode;           // Nội dung (content area)
  footer?: ReactNode;            // Footer buttons (optional)
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';  // Default: 'md'
}
```

## Padding Chuẩn

| Vùng | Padding |
|------|---------|
| Header | `px-6 py-4` |
| Content | `px-6 py-5` (có thể tuỳ chỉnh) |
| Footer | `px-6 py-4` |

## Sử dụng

### 1. Dialog đơn giản (không có footer)

```tsx
import { BaseDialog } from '@/components/common/base-dialog';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Thông báo"
    >
      <p>Nội dung thông báo...</p>
    </BaseDialog>
  );
}
```

### 2. Dialog với form và footer buttons

```tsx
import { BaseDialog } from '@/components/common/base-dialog';
import { Loader2 } from 'lucide-react';

function FormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // ... xử lý submit
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Thêm danh mục"
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="my-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu
          </button>
        </>
      }
    >
      <form id="my-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Form fields */}
      </form>
    </BaseDialog>
  );
}
```

### 3. Dialog với custom maxWidth

```tsx
<BaseDialog
  isOpen={isOpen}
  onClose={onClose}
  title="Quản lý chi tiết"
  maxWidth="3xl"  // Dialog rộng hơn
>
  {/* Content */}
</BaseDialog>
```

## Ví dụ trong hệ thống

- ✅ `catalog/page.tsx` - Form thêm/sửa danh mục
- ✅ `department/page.tsx` - Form thêm/sửa phòng ban
- ✅ `catalog-form-modal.tsx` - Modal tạo catalog
- ✅ `invite-modal.tsx` - Modal mời thành viên
- ✅ `confirm-dialog.tsx` - Dialog xác nhận (pattern riêng, không dùng BaseDialog)
- ✅ `catalog-values-dialog.tsx` - Quản lý values (pattern riêng, không dùng BaseDialog)

## Lưu ý

1. **Form submit từ footer**: Sử dụng `form="form-id"` attribute trên button submit để submit form từ bên ngoài
2. **Loading state**: Hiển thị spinner và disable buttons khi đang xử lý
3. **ESC key**: Dialog tự động đóng khi nhấn ESC (trừ khi có loading state)
4. **Body scroll**: Body tự động lock scroll khi dialog mở

## Migration từ dialog cũ

### Trước:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
    <div className="p-6 border-b">
      <h2>Title</h2>
    </div>
    <div className="p-6">
      {/* Content */}
    </div>
    <div className="flex gap-3 p-6 border-t">
      {/* Buttons */}
    </div>
  </div>
</div>
```

### Sau:
```tsx
<BaseDialog
  isOpen={true}
  onClose={onClose}
  title="Title"
  footer={/* Buttons */}
>
  {/* Content */}
</BaseDialog>
```
