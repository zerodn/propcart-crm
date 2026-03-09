'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataGridColumn<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataGridAction<T = any> {
  icon?: React.ReactNode;
  label: string;
  onClick: (row: T, index: number) => void;
  className?: string;
  variant?: 'primary' | 'danger' | 'success' | 'warning';
  show?: (row: T) => boolean;
}

export interface BaseDataGridProps<T = any> {
  data: T[];
  columns: DataGridColumn<T>[];
  actions?: DataGridAction<T>[];
  pageSize?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onEdit?: (row: T, index: number) => void;
  onDelete?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
}

export function BaseDataGrid<T extends Record<string, any>>({
  data = [],
  columns = [],
  actions = [],
  pageSize = 10,
  isLoading = false,
  emptyMessage = 'Không có dữ liệu',
  emptyIcon,
  onEdit,
  onDelete,
  rowClassName,
}: BaseDataGridProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination calculation
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  // Default actions from props
  const defaultActions: DataGridAction<T>[] = [];
  if (onEdit) {
    defaultActions.push({
      icon: <Edit2 className="h-3.5 w-3.5" />,
      label: 'Sửa',
      onClick: onEdit,
      variant: 'primary',
    });
  }
  if (onDelete) {
    defaultActions.push({
      icon: <Trash2 className="h-3.5 w-3.5" />,
      label: 'Xóa',
      onClick: onDelete,
      variant: 'danger',
    });
  }

  const allActions = [...defaultActions, ...actions];

  // Action button variant styles
  const getActionStyles = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'text-blue-600 bg-blue-50 hover:bg-blue-100';
      case 'danger':
        return 'text-red-600 bg-red-50 hover:bg-red-100';
      case 'success':
        return 'text-green-600 bg-green-50 hover:bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-50 hover:bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-50 hover:bg-gray-100';
    }
  };

  // Handle page change
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset to page 1 if data changes and current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, currentPage, totalPages]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white border-b border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* STT Column */}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
                  STT
                </th>

                {/* Data Columns */}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${column.headerClassName || ''}`}
                  >
                    {column.label}
                  </th>
                ))}

                {/* Actions Column */}
                {allActions.length > 0 && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.map((row, rowIndex) => {
                const globalIndex = startIndex + rowIndex;
                return (
                  <tr
                    key={globalIndex}
                    className={`hover:bg-gray-50 transition-colors ${
                      rowClassName ? rowClassName(row, globalIndex) : ''
                    }`}
                  >
                    {/* STT Cell */}
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {globalIndex + 1}
                    </td>

                    {/* Data Cells */}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-sm text-gray-700 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(row[column.key], row, globalIndex)
                          : row[column.key] || '—'}
                      </td>
                    ))}

                    {/* Actions Cell */}
                    {allActions.length > 0 && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {allActions.map((action, actionIndex) => {
                            // Check if action should be shown
                            if (action.show && !action.show(row)) {
                              return null;
                            }

                            return (
                              <button
                                key={actionIndex}
                                onClick={() => action.onClick(row, globalIndex)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  action.className || getActionStyles(action.variant)
                                }`}
                                title={action.label}
                              >
                                {action.icon}
                                <span>{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-600">
            Hiển thị{' '}
            <span className="font-medium text-gray-900">
              {startIndex + 1} - {Math.min(endIndex, data.length)}
            </span>{' '}
            trong tổng số <span className="font-medium text-gray-900">{data.length}</span> bản ghi
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                // Show first, last, current, and adjacent pages
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                }
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
