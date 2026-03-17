'use client';

import { useState, useRef } from 'react';
import {
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowLeft,
  RefreshCw,
  UserPlus,
  Pencil,
} from 'lucide-react';
import { BaseDialog } from '../common/base-dialog';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface ImportResult {
  success: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

interface PreviewRow {
  rowNumber: number;
  phone: string;
  displayName: string;
  email: string;
  role: string;
  contractType: string;
  city: string;
  ward: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  action: 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';
  errorMessage?: string;
  existingName?: string;
}

interface PreviewResult {
  rows: PreviewRow[];
  summary: { create: number; update: number; skip: number; errors: number };
}

interface MemberImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
}

type Step = 'upload' | 'preview' | 'result';

const ACTION_CONFIG = {
  CREATE: { label: 'Tạo mới', icon: UserPlus, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  UPDATE: { label: 'Cập nhật', icon: Pencil, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  SKIP: { label: 'Bỏ qua', icon: AlertCircle, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400' },
  ERROR: { label: 'Lỗi', icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

export function MemberImportDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
}: MemberImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls)');
      return;
    }
    setSelectedFile(file);
    setPreview(null);
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await apiClient.get(`/workspaces/${workspaceId}/members/template`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau-nhap-nhan-su.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Không thể tải file mẫu');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }
    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await apiClient.post(
        `/workspaces/${workspaceId}/members/import/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const previewData: PreviewResult = data?.data;
      if (!previewData?.rows?.length) {
        toast.info('File không có dữ liệu để xem trước');
        return;
      }
      setPreview(previewData);
      setActiveFilter('ALL');
      setStep('preview');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Không thể đọc file');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await apiClient.post(
        `/workspaces/${workspaceId}/members/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const importResult: ImportResult = data?.data;
      setResult(importResult);
      setStep('result');
      if (importResult.success > 0) {
        toast.success(
          `Import thành công: ${importResult.success} nhân sự${importResult.errors.length > 0 ? `, ${importResult.errors.length} lỗi` : ''}`,
        );
        onSuccess();
      } else if (importResult.errors.length > 0) {
        toast.error(`Import thất bại: ${importResult.errors.length} lỗi`);
      } else {
        toast.info('Không có dữ liệu mới để import');
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Không thể import file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting || isPreviewing) return;
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setStep('upload');
    setActiveFilter('ALL');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setStep('upload');
    setActiveFilter('ALL');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredRows = preview
    ? activeFilter === 'ALL'
      ? preview.rows
      : preview.rows.filter((r) => r.action === activeFilter)
    : [];

  // ── Step indicators ──
  const StepBar = () => (
    <div className="flex justify-center mb-6">
      <div className="flex items-center gap-0 w-full max-w-md">
        {(['upload', 'preview', 'result'] as Step[]).map((s, idx) => {
          const labels = ['Tải lên', 'Xem trước', 'Kết quả'];
          const isActive = step === s;
          const isDone =
            (s === 'upload' && (step === 'preview' || step === 'result')) ||
            (s === 'preview' && step === 'result');
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isDone
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {labels[idx]}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`h-0.5 flex-1 mb-4 transition-all ${isDone ? 'bg-green-400' : 'bg-gray-200'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Import nhân sự từ Excel"
      maxWidth="5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isImporting}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
            )}
            {step === 'result' && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Import file khác
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting || isPreviewing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {step === 'result' ? 'Đóng' : 'Hủy'}
            </button>
            {step === 'upload' && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={!selectedFile || isPreviewing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPreviewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {isPreviewing ? 'Đang đọc...' : 'Xem trước'}
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || (preview?.summary.create === 0 && preview?.summary.update === 0)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? 'Đang import...' : `Xác nhận import (${(preview?.summary.create ?? 0) + (preview?.summary.update ?? 0)} dòng)`}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <StepBar />

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Download template */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">File Excel mẫu</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tải về để xem cấu trúc cột và dữ liệu mẫu, có dropdown chọn tỉnh/phường/vai trò
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Tải file mẫu
              </button>
            </div>

            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn file Excel để import
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const fakeEvent = {
                      target: { files: [file] },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleFileChange(fakeEvent);
                  }
                }}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-12 w-12 text-green-600" />
                    <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Xóa file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Kéo thả file vào đây hoặc{' '}
                      <span className="text-blue-600 font-medium">chọn file</span>
                    </p>
                    <p className="text-xs text-gray-400">Hỗ trợ .xlsx, .xls</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Instructions */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-medium text-amber-800 mb-1">Lưu ý khi import:</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                <li>Cột SĐT là bắt buộc — dùng để tìm tài khoản trong hệ thống</li>
                <li>Nhân sự đã có trong workspace sẽ được cập nhật thông tin</li>
                <li>Nhân sự mới sẽ được tạo với mã nhân viên tự động</li>
                <li>Dòng đầu tiên là tiêu đề, sẽ bị bỏ qua khi import</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            {/* Summary chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  { key: 'ALL', label: `Tất cả (${preview.rows.length})`, bg: 'bg-gray-100', active: 'bg-gray-700 text-white', text: 'text-gray-700' },
                  { key: 'CREATE', label: `Tạo mới (${preview.summary.create})`, bg: 'bg-green-100', active: 'bg-green-600 text-white', text: 'text-green-700' },
                  { key: 'UPDATE', label: `Cập nhật (${preview.summary.update})`, bg: 'bg-blue-100', active: 'bg-blue-600 text-white', text: 'text-blue-700' },
                  { key: 'SKIP', label: `Bỏ qua (${preview.summary.skip})`, bg: 'bg-gray-100', active: 'bg-gray-500 text-white', text: 'text-gray-500' },
                  { key: 'ERROR', label: `Lỗi (${preview.summary.errors})`, bg: 'bg-red-100', active: 'bg-red-600 text-white', text: 'text-red-700' },
                ] as const
              ).map(({ key, label, bg, active, text }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeFilter === key ? active : `${bg} ${text} hover:opacity-80`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Preview table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Dòng</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Trạng thái</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">SĐT</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Tên hiển thị</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Vai trò</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Hợp đồng</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Tỉnh/TP</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Phường/Xã</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                          Không có dòng nào
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const cfg = ACTION_CONFIG[row.action];
                        return (
                          <tr key={row.rowNumber} className={`${cfg.bg} hover:brightness-95 transition-all`}>
                            <td className="px-3 py-2 text-gray-500 font-mono">{row.rowNumber}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-800">{row.phone || '—'}</td>
                            <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">
                              {row.displayName || (row.existingName ? (
                                <span className="text-gray-400 italic">{row.existingName}</span>
                              ) : '—')}
                            </td>
                            <td className="px-3 py-2 text-gray-700">{row.role || '—'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.contractType || '—'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{row.city || '—'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{row.ward || '—'}</td>
                            <td className="px-3 py-2 max-w-[200px]">
                              {row.action === 'UPDATE' && row.existingName && (
                                <span className="text-blue-600 text-xs">Cập nhật từ &quot;{row.existingName}&quot;</span>
                              )}
                              {row.action === 'ERROR' && row.errorMessage && (
                                <span className="text-red-600 text-xs">{row.errorMessage}</span>
                              )}
                              {row.action === 'SKIP' && row.errorMessage && (
                                <span className="text-gray-400 text-xs">{row.errorMessage}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {preview.summary.errors > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ Có {preview.summary.errors} dòng lỗi sẽ bị bỏ qua khi import. Các dòng hợp lệ vẫn được xử lý.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 3: Result ── */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-5 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
                <p className="text-3xl font-bold text-green-700">{result.success}</p>
                <p className="text-sm text-green-600 mt-1">Thành công</p>
              </div>
              <div className="flex flex-col items-center p-5 bg-gray-50 border border-gray-200 rounded-xl">
                <AlertCircle className="h-8 w-8 text-gray-500 mb-2" />
                <p className="text-3xl font-bold text-gray-600">{result.skipped}</p>
                <p className="text-sm text-gray-500 mt-1">Bỏ qua</p>
              </div>
              <div className="flex flex-col items-center p-5 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-3xl font-bold text-red-600">{result.errors.length}</p>
                <p className="text-sm text-red-500 mt-1">Lỗi</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Chi tiết lỗi:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-red-200 rounded-lg p-3 bg-red-50">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">
                      <span className="font-medium">Dòng {err.row}:</span> {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.success > 0 && (
              <p className="text-sm text-center text-green-700 font-medium">
                ✓ Import hoàn tất — {result.success} nhân sự đã được cập nhật
              </p>
            )}
          </div>
        )}
      </div>
    </BaseDialog>
  );
}
