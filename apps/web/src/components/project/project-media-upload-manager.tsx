'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { MediaItem } from '@/hooks/use-project';

export type { MediaItem };

interface ProjectMediaUploadManagerProps {
  label: string;
  hint?: string;
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  uploadFn: (file: File) => Promise<string | null>;
  maxFiles?: number;
  maxFileSizeMB?: number;
  showMultiple?: boolean; // Set to true when allowing multiple uploads like Sản phẩm/Phân khu
  showPrimaryLabel?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

// ─────────────────────────────────────────────────────────────
// Edit Slide Panel
// ─────────────────────────────────────────────────────────────

function MediaEditPanel({
  isOpen,
  item,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  item: MediaItem | null;
  onClose: () => void;
  onSave: (updated: MediaItem) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.fileName ?? '');
      setDescription(item.description ?? '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    onSave({ ...item, fileName: name, description });
    onClose();
  };

  const content = (
    <div className="fixed inset-0 z-[10020]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Chỉnh sửa</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Preview */}
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
            <img
              src={item.thumbnailUrl || item.originalUrl}
              alt="Preview"
              className="w-full h-40 object-cover"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên tệp</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên tệp"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function ProjectMediaUploadManager({
  label,
  hint,
  items,
  onItemsChange,
  uploadFn,
  maxFiles = 10,
  maxFileSizeMB = 10,
  showMultiple = true,
  showPrimaryLabel = false,
  onUploadingChange,
}: ProjectMediaUploadManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    onUploadingChange?.(true);
    const newItems: MediaItem[] = [];

    try {
      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Bỏ qua file không phải hình ảnh: ${file.name}`);
          continue;
        }

        // Check file size limit
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          console.warn(`Bỏ qua file quá lớn: ${file.name}`);
          continue;
        }

        try {
          const url = await uploadFn(file);
          if (url) {
            newItems.push({
              fileName: file.name,
              originalUrl: url,
              thumbnailUrl: url,
              description: '',
            });
          }
        } catch (err) {
          console.error(`Lỗi upload file ${file.name}:`, err);
        }
      }

      // Add all successfully uploaded items
      if (newItems.length > 0) {
        onItemsChange([...items, ...newItems]);
      }
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      // Clear input
      e.target.value = '';
    }
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleEditItem = (item: MediaItem) => {
    setEditingItem(item);
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const next = [...items];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    onItemsChange(next);
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    setDropTargetIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggingIndex === null || draggingIndex === index) {
      setDraggingIndex(null);
      setDropTargetIndex(null);
      return;
    }

    const next = [...items];
    const [moved] = next.splice(draggingIndex, 1);
    next.splice(index, 0, moved);
    onItemsChange(next);
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  const handleSaveItem = (updated: MediaItem) => {
    onItemsChange(items.map((item) => (item.originalUrl === updated.originalUrl ? updated : item)));
    setEditingItem(null);
  };

  const canAddMore = items.length < maxFiles;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>

        {/* Upload area - ALWAYS show when can add more */}
        {canAddMore && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={`w-full flex flex-col items-center gap-2 py-6 mb-4 border-2 border-dashed rounded-xl transition-colors ${
              uploading
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
            }`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-amber-500" />
            )}
            <span className="text-sm text-gray-600">
              {uploading ? 'Đang tải...' : 'Kéo thả hoặc tải tệp lên'}
            </span>
            {hint && <span className="text-xs text-gray-400">{hint}</span>}
          </button>
        )}

        {!canAddMore && (
          <div className="w-full py-3 mb-4 px-3 text-center text-xs text-red-500 font-medium bg-red-50 rounded-lg border border-red-200">
            Đã đạt giới hạn ({maxFiles} tệp)
          </div>
        )}

        {/* Items Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`relative group rounded-xl transition-all ${
                  draggingIndex === idx ? 'opacity-60 scale-[0.98]' : ''
                } ${dropTargetIndex === idx && draggingIndex !== idx ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
              >
                {/* Thumbnail */}
                <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 h-32">
                  <img
                    src={item.thumbnailUrl || item.originalUrl}
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-amber-500 hover:text-white"
                      aria-label="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Move left */}
                    <button
                      type="button"
                      onClick={() => handleMoveItem(idx, idx - 1)}
                      disabled={idx === 0}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-amber-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Di chuyển sang trái"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Move right */}
                    <button
                      type="button"
                      onClick={() => handleMoveItem(idx, idx + 1)}
                      disabled={idx === items.length - 1}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-amber-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Di chuyển sang phải"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white"
                      aria-label="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Label */}
                <p className="text-xs text-gray-700 font-medium mt-1.5 truncate">{item.fileName}</p>
                {showPrimaryLabel && idx === 0 && (
                  <span className="inline-flex mt-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">
                    Ảnh đại diện
                  </span>
                )}
                {item.description && (
                  <p className="text-xs text-gray-500 truncate italic">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Placeholder when at max and no items */}
        {items.length === 0 && !canAddMore && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">Chưa có tệp nào</p>
          </div>
        )}
      </div>

      {/* Edit Panel */}
      <MediaEditPanel
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
      />

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={showMultiple}
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
