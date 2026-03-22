'use client';

import { useState, useEffect, useMemo } from 'react';
import { Building2, Plus, Edit2, Trash2, Users, Loader2 } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useDepartment } from '@/hooks/use-department';
import { useCatalog } from '@/hooks/use-catalog';
import { DepartmentForm } from '@/components/department/department-form';
import { DepartmentMembersDialog } from '@/components/department/department-members-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDialog } from '@/components/common/base-dialog';
import { GridSkeleton } from '@/components/common/skeleton';

export default function DepartmentPage() {
  const { t } = useI18n();
  const {
    departments,
    memberOptions,
    roleOptions,
    parentOptions,
    isLoading,
    error,
    create,
    update,
    delete: deleteDepartment,
    addMember,
    removeMember,
    updateMemberRole,
    searchMembers,
  } = useDepartment();
  const { items: catalogs } = useCatalog();

  const statusOptions = useMemo(() => {
    const target = catalogs.find((c) => {
      const code = (c.code || '').toUpperCase();
      const type = (c.type || '').toUpperCase();
      return code === 'DEPARTMENT_STATUS' || type === 'DEPARTMENT_STATUS';
    });
    return (target?.values || []).map((v) => ({ value: v.value, label: v.label, color: v.color }));
  }, [catalogs]);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingDeptId, setManagingDeptId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  usePageSetup({
    title: t('department.title'),
    subtitle: t('department.subtitle'),
    actions: (
      <button
        onClick={() => {
          setEditingId(null);
          setShowForm(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white text-sm font-medium rounded-lg hover:bg-[#B89655] transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('department.addBtn')}
      </button>
    ),
  });

  // Handle ESC key for form dialog
  useEffect(() => {
    if (!showForm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setShowForm(false);
        setEditingId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showForm, isSubmitting]);

  const editingDepartment = Array.isArray(departments)
    ? departments.find((d) => d.id === editingId)
    : undefined;
  const managingDepartment = Array.isArray(departments)
    ? departments.find((d) => d.id === managingDeptId) || null
    : null;

  const handleSubmit = async (name: string, code: string, description?: string, parentId?: string, status?: string) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, { name, code, description, parentId: parentId || null, status: status || undefined });
        setEditingId(null);
      } else {
        await create(name, code, description, parentId, status);
      }
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDepartment(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
    } catch {
      // Error is already handled by hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-[0.8rem]">
      {/* Form Dialog */}
      <BaseDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? t('department.editTitle') : t('department.addTitle')}
        maxWidth="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="department-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#CFAF6E] text-white rounded-lg text-sm font-medium hover:bg-[#B89655] disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? t('common.update') : t('common.addNew')}
            </button>
          </>
        }
      >
        <DepartmentForm
          formId="department-form"
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          parentOptions={parentOptions}
          statusOptions={statusOptions}
          initialData={
            editingDepartment
              ? {
                  name: editingDepartment.name,
                  code: editingDepartment.code,
                  description: editingDepartment.description,
                  id: editingDepartment.id,
                  parentId: editingDepartment.parentId,
                  status: editingDepartment.status,
                }
              : undefined
          }
        />
      </BaseDialog>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && <GridSkeleton cols={3} rows={2} />}

      {/* Empty State */}
      {!isLoading && departments.length === 0 && (
        <div className="text-center py-12 glass-content-card rounded-xl">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">Chưa có phòng ban nào</p>
          <p className="text-sm text-gray-500 mt-1">
            Hãy tạo phòng ban đầu tiên để tổ chức đội ngũ
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && departments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="glass-content-card rounded-xl p-4 transition-colors flex flex-col"
            >
              <div className="flex-1 mb-4">
                <h3 className="font-medium text-gray-900 truncate">{dept.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Mã phòng: {dept.code}</p>
                {dept.parent && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Trực thuộc:{' '}
                    <span className="font-medium text-gray-700">{dept.parent.name}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#F5F7FA] rounded text-xs text-[#CFAF6E]">
                    <Users className="h-3 w-3" />
                    {(dept.members || []).length} nhân sự
                  </div>
                  {dept.status && (() => {
                    const opt = statusOptions.find((o) => o.value === dept.status);
                    const label = opt?.label || dept.status;
                    const style = opt?.color
                      ? { backgroundColor: `${opt.color}20`, color: opt.color }
                      : undefined;
                    return (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${opt?.color ? '' : 'bg-gray-100 text-gray-600'}`}
                        style={style}
                      >
                        {label}
                      </span>
                    );
                  })()}
                </div>
                {dept.description && (
                  <p className="text-sm text-gray-600 mt-3">{dept.description}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setManagingDeptId(dept.id);
                    setShowMembersDialog(true);
                  }}
                  className="w-full py-2 px-3 bg-[#F5F7FA] text-[#CFAF6E] text-sm font-medium rounded-lg hover:bg-[#CFAF6E]/15 transition-colors"
                >
                  {t('departments.manageMembers')}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setEditingId(dept.id);
                      setShowForm(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    title={t('common.editInfo')}
                  >
                    <Edit2 className="h-4 w-4" />
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentMembersDialog
        isOpen={showMembersDialog}
        department={managingDepartment}
        memberOptions={memberOptions}
        roleOptions={roleOptions}
        onClose={() => {
          setShowMembersDialog(false);
          setManagingDeptId(null);
        }}
        onAddMember={addMember}
        onRemoveMember={removeMember}
        onUpdateMemberRole={updateMemberRole}
        onSearchMembers={searchMembers}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('departments.action.deleteTitle')}
        message={t('departments.confirm.deleteText')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
