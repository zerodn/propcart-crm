'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { useDepartment } from '@/hooks/use-department';
import { DepartmentForm } from '@/components/department/department-form';
import { DepartmentMembersDialog } from '@/components/department/department-members-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import type { Department } from '@/hooks/use-department';

export default function DepartmentPage() {
  const { t } = useI18n();
  const {
    departments,
    memberOptions,
    roleOptions,
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
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingDeptId, setManagingDeptId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleSubmit = async (name: string, code: string, description?: string) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, { name, code, description });
        setEditingId(null);
      } else {
        await create(name, code, description);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 md:flex-row flex-col md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('department.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('department.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          {t('department.addBtn')}
        </button>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? t('department.editTitle') : t('department.addTitle')}
              </h2>
            </div>
            <div className="p-6">
              <DepartmentForm
                onSubmit={handleSubmit}
                isLoading={isSubmitting}
                onCancel={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                initialData={
                  editingDepartment
                    ? {
                        name: editingDepartment.name,
                        code: editingDepartment.code,
                        description: editingDepartment.description,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-28" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && departments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
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
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors flex flex-col"
            >
              <div className="flex-1 mb-4">
                <h3 className="font-medium text-gray-900 truncate">{dept.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Mã phòng: {dept.code}</p>
                <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-600">
                  <Users className="h-3 w-3" />
                  {(dept.members || []).length} nhân sự
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
                  className="w-full py-2 px-3 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Quản lý nhân sự & gán quyền
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setEditingId(dept.id);
                      setShowForm(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="h-4 w-4" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
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
        title="Xóa phòng ban"
        message="Bạn có chắc chắn muốn xóa phòng ban này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
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
