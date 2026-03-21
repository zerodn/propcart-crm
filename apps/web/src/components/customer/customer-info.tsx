'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import type { CustomerInfo } from '@/hooks/use-customer';

// ─── Sortable Row ──────────────────────────────────────────────────────────────
interface SortableInfoRowProps {
  item: CustomerInfo;
  onUpdate: (id: string, field: keyof Pick<CustomerInfo, 'category' | 'info' | 'description'>, value: string) => void;
  onDelete: (id: string) => void;
  isSubmitting?: boolean;
}

function SortableInfoRow({ item, onUpdate, onDelete, isSubmitting }: SortableInfoRowProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const inputCls =
    'w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50">
      {/* Drag handle */}
      <td className="w-8 px-2 py-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
          title="Kéo để sắp xếp"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>

      {/* Category */}
      <td className="px-2 py-1.5">
        <input
          type="text"
          defaultValue={item.category || ''}
          onBlur={(e) => onUpdate(item.id, 'category', e.target.value)}
          placeholder={t('customer.info.category')}
          disabled={isSubmitting}
          className={inputCls}
        />
      </td>

      {/* Info */}
      <td className="px-2 py-1.5">
        <input
          type="text"
          defaultValue={item.info || ''}
          onBlur={(e) => onUpdate(item.id, 'info', e.target.value)}
          placeholder={t('customer.info.infoLabel')}
          disabled={isSubmitting}
          className={inputCls}
        />
      </td>

      {/* Description */}
      <td className="px-2 py-1.5">
        <input
          type="text"
          defaultValue={item.description || ''}
          onBlur={(e) => onUpdate(item.id, 'description', e.target.value)}
          placeholder={t('customer.info.description')}
          disabled={isSubmitting}
          className={inputCls}
        />
      </td>

      {/* Delete */}
      <td className="w-10 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={isSubmitting}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Main CustomerInfoTab ──────────────────────────────────────────────────────
interface CustomerInfoTabProps {
  customerId: string;
  listInfos: (id: string) => Promise<{ data: CustomerInfo[] }>;
  createInfo: (
    id: string,
    payload: { category?: string; info?: string; description?: string },
  ) => Promise<unknown>;
  updateInfo: (
    id: string,
    infoId: string,
    payload: { category?: string; info?: string; description?: string },
  ) => Promise<unknown>;
  deleteInfo: (id: string, infoId: string) => Promise<void>;
  reorderInfos: (id: string, ids: string[]) => Promise<void>;
}

export function CustomerInfoTab({
  customerId,
  listInfos,
  createInfo,
  updateInfo,
  deleteInfo,
  reorderInfos,
}: CustomerInfoTabProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<CustomerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listInfos(customerId);
      setItems(res.data || []);
    } catch {
      toast.error(t('customer.info.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, listInfos]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddRow = async () => {
    setIsSubmitting(true);
    try {
      await createInfo(customerId, {});
      await load();
    } catch {
      toast.error(t('customer.info.addError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (
    infoId: string,
    field: 'category' | 'info' | 'description',
    value: string,
  ) => {
    try {
      await updateInfo(customerId, infoId, { [field]: value || undefined });
      // Update local state silently
      setItems((prev) =>
        prev.map((item) => (item.id === infoId ? { ...item, [field]: value || null } : item)),
      );
    } catch {
      toast.error(t('customer.info.updateError'));
    }
  };

  const handleDelete = async (infoId: string) => {
    setIsSubmitting(true);
    try {
      await deleteInfo(customerId, infoId);
      setItems((prev) => prev.filter((item) => item.id !== infoId));
    } catch {
      toast.error(t('customer.info.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (infoId: string) => {
    const item = items.find((i) => i.id === infoId);
    const hasData = !!(item?.category || item?.info || item?.description);
    if (hasData) {
      setConfirmDeleteId(infoId);
    } else {
      handleDelete(infoId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    setItems(reordered);

    try {
      await reorderInfos(customerId, reordered.map((item) => item.id));
    } catch {
      // Revert on error
      setItems(items);
      toast.error(t('customer.info.updateError'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">{t('customer.info.empty')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('customer.info.category')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('customer.info.infoLabel')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('customer.info.description')}
                </th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item) => (
                    <SortableInfoRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdate}
                      onDelete={handleDeleteRequest}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}

      {/* Add row button */}
      <button
        type="button"
        onClick={handleAddRow}
        disabled={isSubmitting}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {t('customer.info.addRow')}
      </button>

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await handleDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        title={t('customer.info.confirmDeleteTitle')}
        message={t('customer.info.confirmDeleteMessage')}
        isDangerous
        isLoading={isSubmitting}
      />
    </div>
  );
}
