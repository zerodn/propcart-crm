'use client';

import { useState, useEffect } from 'react';
import { Loader2, Upload, FileText, Trash2, Eye, Download, X, Camera, User } from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import { PersonalInfoForm, type LocationFormData } from '@/components/common/personal-info-form';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface AttachmentDocument {
  id: string;
  fileName: string;
  documentType: 'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER';
  downloadUrl: string;
  createdAt?: string;
  fileSize?: number;
}

interface MemberEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  member: {
    id: string;
    userId: string;
    roleId: string;
    status: number;
    displayName?: string | null;
    workspaceEmail?: string | null;
    workspacePhone?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    workspaceCity?: string | null;
    workspaceAddress?: string | null;
    attachmentUrl?: string | null;
    avatarUrl?: string | null;
    user: {
      phone: string | null;
      email: string | null;
      fullName: string | null;
    };
    role: {
      id: string;
      code: string;
      name: string;
    };
  };
  availableRoles?: Array<{ id: string; code: string; name: string }> | null;
}

export function MemberEditDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  member,
  availableRoles = [],
}: MemberEditDialogProps) {
  const [roleId, setRoleId] = useState(member.roleId);
  const [status, setStatus] = useState(member.status);
  const [displayName, setDisplayName] = useState(member.displayName || member.user.fullName || '');
  const [workspaceEmail, setWorkspaceEmail] = useState(member.workspaceEmail || member.user.email || '');
  const [workspacePhone, setWorkspacePhone] = useState(member.workspacePhone || member.user.phone || '');
  const [locationData, setLocationData] = useState<LocationFormData>({
    provinceCode: member.workspaceCity || '',
    provinceName: member.workspaceCity || '',
    wardCode: '',
    wardName: member.workspaceAddress || '',
    gender: member.gender || '',
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
  });
  const [attachmentUrl, setAttachmentUrl] = useState(member.attachmentUrl || '');
  const [attachmentType, setAttachmentType] = useState<'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER'>('OTHER');
  const [attachmentDocuments, setAttachmentDocuments] = useState<AttachmentDocument[]>([]);
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoadingAttachmentDocuments, setIsLoadingAttachmentDocuments] = useState(false);
  const [updatingAttachmentTypes, setUpdatingAttachmentTypes] = useState<Record<string, boolean>>({});
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<Set<string>>(new Set());
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [downloadingDocIds, setDownloadingDocIds] = useState<Set<string>>(new Set());

  // Ensure availableRoles is always an array
  const rolesArray = Array.isArray(availableRoles) ? availableRoles : [];

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (isOpen) {
      setRoleId(member.roleId);
      setStatus(member.status);
      setDisplayName(member.displayName || member.user.fullName || '');
      setWorkspaceEmail(member.workspaceEmail || member.user.email || '');
      setWorkspacePhone(member.workspacePhone || member.user.phone || '');
      setLocationData({
        provinceCode: member.workspaceCity || '',
        provinceName: member.workspaceCity || '',
        wardCode: '',
        wardName: member.workspaceAddress || '',
        gender: member.gender || '',
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
      });
      setAttachmentUrl(member.attachmentUrl || '');
      setAttachmentType('OTHER');
      setUpdatingAttachmentTypes({});

      const loadAttachmentDocuments = async () => {
        setIsLoadingAttachmentDocuments(true);
        try {
          const response = await apiClient.get('/me/profile/documents');
          const docs = Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response?.data)
              ? response.data
              : [];
          const normalizedDocs: AttachmentDocument[] = docs
            .filter((doc: any) => doc?.id && doc?.downloadUrl)
            .map((doc: any) => ({
              id: doc.id,
              fileName: doc.fileName || 'Tep dinh kem',
              documentType: (doc.documentType || 'OTHER') as AttachmentDocument['documentType'],
              downloadUrl: doc.downloadUrl,
              createdAt: doc.createdAt,
              fileSize: doc.fileSize,
            }));
          setAttachmentDocuments(normalizedDocs);
        } catch {
          setAttachmentDocuments([]);
          toast.error('Khong the tai danh sach tai lieu');
        } finally {
          setIsLoadingAttachmentDocuments(false);
        }
      };

      loadAttachmentDocuments();
    }
  }, [isOpen, member]);

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', attachmentType);

      const { data } = await apiClient.post('/me/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploaded = data?.data;
      const downloadUrl = uploaded?.downloadUrl;
      const fileName = uploaded?.fileName || file.name;

      if (downloadUrl) {
        setAttachmentUrl(downloadUrl);
        if (uploaded?.id) {
          const newDocument: AttachmentDocument = {
            id: uploaded.id,
            fileName,
            documentType: (uploaded.documentType || attachmentType) as AttachmentDocument['documentType'],
            downloadUrl,
            createdAt: uploaded.createdAt,
            fileSize: uploaded.fileSize,
          };
          setAttachmentDocuments((prev) => [newDocument, ...prev.filter((doc) => doc.id !== uploaded.id)]);
        }
        toast.success('Đã tải lên tệp đính kèm');
      } else {
        toast.error('Tải lên thành công nhưng không nhận được URL tệp');
      }
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === 'FILE_TOO_LARGE') {
        toast.error('File quá lớn (tối đa 20MB)');
      } else if (code === 'FILE_TYPE_INVALID') {
        toast.error('Chỉ hỗ trợ PDF, DOC, DOCX, PNG, JPG');
      } else {
        toast.error('Không thể tải tệp đính kèm');
      }
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleUpdateAttachmentType = async (
    documentId: string,
    newType: AttachmentDocument['documentType'],
  ) => {
    setUpdatingAttachmentTypes((prev) => ({ ...prev, [documentId]: true }));
    try {
      await apiClient.patch(`/me/profile/documents/${documentId}/type`, { documentType: newType });
      setAttachmentDocuments((prev) =>
        prev.map((doc) => (doc.id === documentId ? { ...doc, documentType: newType } : doc)),
      );
      toast.success('Da cap nhat loai tai lieu');
    } catch {
      toast.error('Khong the cap nhat loai tai lieu');
    } finally {
      setUpdatingAttachmentTypes((prev) => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingAttachmentIds((prev) => new Set([...prev, documentId]));
    try {
      await apiClient.delete(`/me/profile/documents/${documentId}`);
      setAttachmentDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success('Da xoa tai lieu');
    } catch {
      toast.error('Khong the xoa tai lieu');
    } finally {
      setDeletingAttachmentIds((prev) => {
        const updated = new Set(prev);
        updated.delete(documentId);
        return updated;
      });
    }
  };

  const handleOpenPreview = async (doc: AttachmentDocument) => {
    try {
      setIsLoadingPreview(true);
      setPreviewingDocId(doc.id);
      setPreviewFileName(doc.fileName);
      
      // Use apiClient with blob response to properly route to backend API (port 3000)
      const response = await apiClient.get(doc.downloadUrl, { responseType: 'blob' });
      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      setPreviewDownloadUrl(blobUrl);
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Khong the mo file');
      setPreviewingDocId(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    if (previewDownloadUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewDownloadUrl);
    }
    setPreviewingDocId(null);
    setPreviewFileName(null);
    setPreviewDownloadUrl(null);
  };

  const handleDownloadDocument = async (doc: AttachmentDocument) => {
    try {
      setDownloadingDocIds((prev) => new Set([...prev, doc.id]));
      
      // Use apiClient with blob response to properly route to backend API (port 3000)
      const response = await apiClient.get(doc.downloadUrl, { responseType: 'blob' });
      const blob = response.data;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Đã tải xuống tệp');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Không thể tải xuống file. Vui lòng thử lại sau.');
    } finally {
      setDownloadingDocIds((prev) => {
        const updated = new Set(prev);
        updated.delete(doc.id);
        return updated;
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa 5MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrl);
    }
    setAvatarUrl('');
    setAvatarFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let uploadedAvatarUrl = avatarUrl;

      // Upload avatar if new file selected
      if (avatarFile) {
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        try {
          const { data } = await apiClient.post(
            `/workspaces/${workspaceId}/members/${member.id}/upload-avatar`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          uploadedAvatarUrl = data?.data?.avatarUrl || avatarUrl;
          toast.success('Đã tải lên avatar');
        } catch (uploadErr) {
          console.error('Avatar upload error:', uploadErr);
          toast.error('Không thể tải lên avatar');
          setIsUploadingAvatar(false);
          setIsSubmitting(false);
          return;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      await apiClient.patch(`/workspaces/${workspaceId}/members/${member.id}`, {
        roleId,
        status,
        displayName: displayName || null,
        workspaceEmail: workspaceEmail || null,
        workspacePhone: workspacePhone || null,
        avatarUrl: uploadedAvatarUrl || null,
        gender: locationData.gender || null,
        dateOfBirth: locationData.dateOfBirth ? new Date(locationData.dateOfBirth).toISOString() : null,
        workspaceCity: locationData.provinceName || null,
        workspaceAddress: locationData.wardName || null,
        attachmentUrl: attachmentUrl || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update member error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Cập nhật thông tin nhân sự"
      maxWidth="5xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="member-edit-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Cập nhật
          </button>
        </>
      }
    >
      <form id="member-edit-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-700 mb-1">Thông tin gốc từ tài khoản</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
            <p><span className="font-medium">Tên:</span> {member.user.fullName || 'Chưa có'}</p>
            <p><span className="font-medium">Email:</span> {member.user.email || 'Chưa có'}</p>
            <p><span className="font-medium">SĐT:</span> {member.user.phone || 'Chưa có'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-4 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Thông tin trong workspace này</h4>
              <p className="text-xs text-gray-500 mt-1">
                Chỉ ảnh hưởng trong workspace này, không thay đổi thông tin gốc.
              </p>
            </div>

              {/* Avatar Upload */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avatar trong workspace</label>
                  <div className="flex gap-2">
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      {avatarUrl ? 'Thay đổi' : 'Tải lên'}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={isSubmitting || isUploadingAvatar}
                      className="hidden"
                    />
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={isSubmitting || isUploadingAvatar}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF. Tối đa 5MB</p>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="space-y-4 pb-6 border-b border-gray-200">
                <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Thông tin cơ bản</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên hiển thị</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={member.user.fullName || 'Nhập tên hiển thị'}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email trong workspace</label>
                    <input
                      type="email"
                      value={workspaceEmail}
                      onChange={(e) => setWorkspaceEmail(e.target.value)}
                      placeholder={member.user.email || 'Nhập email'}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại trong workspace</label>
                    <input
                      type="tel"
                      value={workspacePhone}
                      onChange={(e) => setWorkspacePhone(e.target.value)}
                      placeholder={member.user.phone || 'Nhập số điện thoại'}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vai trò trong workspace</label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
                    >
                      {rolesArray.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(Number(e.target.value))}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
                    >
                      <option value={1}>Hoạt động</option>
                      <option value={0}>Vô hiệu hóa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Thông tin cá nhân */}
              <div className="space-y-4 pb-6 border-b border-gray-200">
                <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Thông tin cá nhân</h5>
                <PersonalInfoForm
                  data={locationData}
                  onChange={setLocationData}
                  isDisabled={isSubmitting}
                  showGenderAndDOB={true}
                  hideHeader={true}
                  genderDobInline={true}
                />
              </div>

              {/* Tài liệu liên quan */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tài liệu liên quan</h5>
                  <p className="text-xs text-gray-500 mt-1">Hỗ trợ PDF, DOC, DOCX, PNG, JPG (tối đa 20MB)</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={attachmentType}
                      onChange={(e) => setAttachmentType(e.target.value as 'CCCD' | 'HDLD' | 'CHUNG_CHI' | 'OTHER')}
                      disabled={isSubmitting || isUploadingAttachment}
                      className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    >
                      <option value="CCCD">Loại: CCCD</option>
                      <option value="HDLD">Loại: HDLD</option>
                      <option value="CHUNG_CHI">Loại: Chứng chỉ</option>
                      <option value="OTHER">Loại: Khác</option>
                    </select>

                    <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer disabled:opacity-50">
                      {isUploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Tải lên
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleUploadAttachment}
                        disabled={isSubmitting || isUploadingAttachment}
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    {isLoadingAttachmentDocuments ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tai danh sach tai lieu...
                      </div>
                    ) : attachmentDocuments.length > 0 ? (
                      attachmentDocuments.map((doc) => {
                        const isUpdatingType = !!updatingAttachmentTypes[doc.id];
                        const isDeleting = deletingAttachmentIds.has(doc.id);
                        return (
                          <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {doc.fileName} <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                              </p>
                            </div>
                            <select
                              value={doc.documentType}
                              onChange={(e) =>
                                handleUpdateAttachmentType(
                                  doc.id,
                                  e.target.value as AttachmentDocument['documentType'],
                                )
                              }
                              disabled={isSubmitting || isUpdatingType || isDeleting}
                              className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs disabled:opacity-60"
                            >
                              <option value="CCCD">CCCD</option>
                              <option value="HDLD">HDLD</option>
                              <option value="CHUNG_CHI">Chung chi</option>
                              <option value="OTHER">Khac</option>
                            </select>
                            {isUpdatingType && <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />}
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(doc)}
                              disabled={isSubmitting || isDeleting}
                              className="flex-shrink-0 p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(doc)}
                              disabled={isSubmitting || isDeleting || downloadingDocIds.has(doc.id)}
                              className="flex-shrink-0 p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50"
                            >
                              {downloadingDocIds.has(doc.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={isSubmitting || isDeleting}
                              className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-3">
                        Chua co tep dinh kem nao.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </form>

      {previewingDocId && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={handleClosePreview}
          ></div>
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-2/5 bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{previewFileName}</h3>
              <button
                onClick={handleClosePreview}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">Dang tai file...</p>
                  </div>
                </div>
              ) : previewDownloadUrl ? (
                <iframe
                  src={previewDownloadUrl}
                  className="w-full h-full rounded-lg border border-gray-200"
                  title="Document Preview"
                  onError={() => {
                    toast.error('Khong the hien thi file');
                    handleClosePreview();
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500">Khong the tai file</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </BaseDialog>
  );
}
