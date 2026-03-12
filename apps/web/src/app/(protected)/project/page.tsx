'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Loader2, MoreHorizontal, Plus, Filter, Eye, Pencil, Trash2, Building2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { getAccessToken } from '@/lib/auth';
import { useProject, Project } from '@/hooks/use-project';
import { useCatalog } from '@/hooks/use-catalog';
import { ProjectTypeDialog } from '@/components/project/project-type-dialog';
import { ProjectForm } from '@/components/project/project-form';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

const SALE_STATUS_LABEL: Record<string, string> = {
  COMING_SOON: 'Sắp mở bán',
  ON_SALE: 'Đang mở bán',
  SOLD_OUT: 'Đã bán hết',
};

const SALE_STATUS_COLOR: Record<string, string> = {
  COMING_SOON: 'bg-blue-100 text-blue-700',
  ON_SALE: 'bg-green-100 text-green-700',
  SOLD_OUT: 'bg-gray-100 text-gray-600',
};

const PROJECT_TYPE_LABEL: Record<string, string> = {
  LOW_RISE: 'Dự án thấp tầng',
  HIGH_RISE: 'Dự án cao tầng',
};

function SaleStatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SALE_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {SALE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ProjectTypeBadge({ type }: { type: string }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
      {PROJECT_TYPE_LABEL[type] ?? type}
    </span>
  );
}

function CardMenu({
  onView,
  onEdit,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/80 transition-colors"
        aria-label="Tùy chọn"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-36">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4 text-gray-400" /> Xem chi tiết
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4 text-gray-400" /> Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Xóa
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Pagination({
  total,
  page,
  limit,
  onPageChange,
}: {
  total: number;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (page > 4) pages.push('...');
      if (page > 3 && page < totalPages - 2) pages.push(page);
      if (page < totalPages - 3) pages.push('...');
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    }
    return [...new Set(pages)];
  };

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Trang trước"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors border ${
              p === page
                ? 'bg-amber-600 text-white border-amber-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Trang sau"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}

const PAGE_LIMIT = 9;

export default function ProjectPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id ?? '';

  const { projects, total, isLoading, list, create, update, remove, uploadImage } = useProject(workspaceId);
  const { items: ownerCatalogItems } = useCatalog('PROJECT_OWNER');
  const { items: saleStatusCatalogItems } = useCatalog('PROJECT_SALE_STATUS');

  const [currentPage, setCurrentPage] = useState(1);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<'LOW_RISE' | 'HIGH_RISE' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [draftByType, setDraftByType] = useState<Partial<Record<'LOW_RISE' | 'HIGH_RISE', Project>>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const ownerOptions = useMemo(
    () => {
      const catalog = ownerCatalogItems.find((c) => c.type === 'PROJECT_OWNER') ?? ownerCatalogItems[0];
      return catalog?.values?.map((v) => ({ value: v.value, label: v.label })) ?? [];
    },
    [ownerCatalogItems],
  );

  const saleStatusOptions = useMemo(
    () => {
      const catalog = saleStatusCatalogItems.find((c) => c.type === 'PROJECT_SALE_STATUS') ?? saleStatusCatalogItems[0];
      return catalog?.values?.map((v) => ({ value: v.value, label: v.label })) ?? [];
    },
    [saleStatusCatalogItems],
  );

  useEffect(() => {
    if (!workspaceId) return;
    list({ page: currentPage, limit: PAGE_LIMIT });
  }, [workspaceId, currentPage, list]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setSelectedType(null);
    setShowTypeDialog(true);
  };

  const handleTypeConfirm = (type: 'LOW_RISE' | 'HIGH_RISE') => {
    setEditingProject(draftByType[type] ?? null);
    setSelectedType(type);
    setShowTypeDialog(false);
    setShowForm(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setSelectedType(project.projectType);
    setShowForm(true);
  };

  const handleFormSubmit = async (
    payload: any,
    options?: { closeAfterSave?: boolean; projectId?: string; silent?: boolean },
  ): Promise<Project | null> => {
    setIsSubmitting(true);

    const shouldClose = options?.closeAfterSave ?? true;
    const targetId = options?.projectId ?? editingProject?.id;

    let saved: Project | null = null;
    if (targetId) {
      saved = await update(targetId, payload, { silent: options?.silent });
    } else {
      saved = await create(payload, { silent: options?.silent });
    }

    setIsSubmitting(false);

    if (saved) {
      setDraftByType((prev) => ({ ...prev, [saved.projectType]: saved }));
      if (editingProject && editingProject.id === saved.id) {
        setEditingProject(saved);
      }
      if (shouldClose) {
        setShowForm(false);
      }
      list({ page: currentPage, limit: PAGE_LIMIT });
    }

    return saved;
  };

  const handleFormClose = () => {
    setEditingProject(null);
    setSelectedType(null);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const ok = await remove(deleteId);
    setIsDeleting(false);
    if (ok) {
      setDeleteId(null);
      list({ page: currentPage, limit: PAGE_LIMIT });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-600" />
          Dự án
        </h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm mới
        </button>
      </div>

      <div className="flex items-center px-6 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-3.5 h-3.5" /> Bộ lọc
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <FolderOpen className="w-12 h-12 text-gray-300" />
            <p className="text-sm font-medium">Chưa có dự án nào</p>
            <p className="text-xs">Nhấn "+ Thêm mới" để tạo dự án đầu tiên</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-44 bg-gray-100">
                  {project.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.bannerUrl}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-300" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <SaleStatusBadge status={project.saleStatus} />
                    <ProjectTypeBadge type={project.projectType} />
                  </div>

                  <div className="absolute top-2 right-2">
                    <CardMenu
                      onView={() => {}}
                      onEdit={() => handleOpenEdit(project)}
                      onDelete={() => setDeleteId(project.id)}
                    />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{project.name}</h3>
                  {(project.ward || project.district || project.province) && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {[project.ward, project.district, project.province].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoading && projects.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 flex-shrink-0">
          <span className="text-sm text-gray-500">Có {total.toLocaleString('vi-VN')} kết quả</span>
          <Pagination
            total={total}
            page={currentPage}
            limit={PAGE_LIMIT}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      <ProjectTypeDialog
        isOpen={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        onConfirm={handleTypeConfirm}
      />

      {showForm && selectedType && (
        <ProjectForm
          isOpen={showForm}
          onClose={handleFormClose}
          editingProject={editingProject}
          projectType={selectedType}
          ownerOptions={ownerOptions}
          saleStatusOptions={saleStatusOptions}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          uploadImage={uploadImage}
          accessToken={getAccessToken() || ''}
          workspaceId={workspaceId}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xóa dự án"
        message="Bạn có chắc muốn xóa dự án này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
}
