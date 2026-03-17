'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight, MoreVertical, Search } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export interface DataGridColumn<T = object> {
  key: string;
  label: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataGridAction<T = object> {
  icon?: React.ReactNode;
  label: string;
  onClick: (row: T, index: number) => void;
  className?: string;
  variant?: 'primary' | 'danger' | 'success' | 'warning';
  show?: (row: T) => boolean;
}

export interface BaseDataGridProps<T = object> {
  data: T[];
  columns: DataGridColumn<T>[];
  actions?: DataGridAction<T>[];
  pageSize?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  showTableWhenEmpty?: boolean;
  onRowClick?: (row: T, index: number) => void;
  onEdit?: (row: T, index: number) => void;
  onDelete?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  // Header section
  title?: string;
  titleIcon?: React.ReactNode;
  badgeCount?: number;
  headerActions?: React.ReactNode;
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  // Server-side pagination (when provided, BaseDataGrid acts as a controlled component)
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function BaseDataGrid<T extends object>({
  data = [],
  columns = [],
  actions = [],
  pageSize = 10,
  isLoading = false,
  emptyMessage = 'Không có dữ liệu',
  emptyIcon,
  showTableWhenEmpty = false,
  onRowClick,
  onEdit,
  onDelete,
  rowClassName,
  title,
  titleIcon,
  badgeCount,
  headerActions,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  totalItems,
  currentPage: externalPage,
  onPageChange,
}: BaseDataGridProps<T>) {
  const [internalPage, setInternalPage] = useState(1);

  // Server-side mode: parent controls page + total count
  const isServerSide = totalItems !== undefined && onPageChange !== undefined;
  const activePage = isServerSide ? (externalPage ?? 1) : internalPage;

  const renderDefaultCell = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return '—';
  };

  // Pagination calculation
  const totalCount = isServerSide ? (totalItems ?? 0) : data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = isServerSide ? data : data.slice(startIndex, endIndex);

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

  // Handle page change
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      if (isServerSide) {
        onPageChange!(page);
      } else {
        setInternalPage(page);
      }
    }
  };

  // Reset to page 1 if data changes and current page is out of bounds (client-side only)
  useEffect(() => {
    if (!isServerSide && internalPage > totalPages && totalPages > 0) {
      setInternalPage(1);
    }
  }, [data.length, internalPage, totalPages]);

  const headerSection = (title || onSearchChange !== undefined || headerActions) ? (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {titleIcon}
          {title}
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
              {badgeCount}
            </span>
          )}
        </h3>
      )}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        {onSearchChange !== undefined && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder ?? 'Tìm kiếm...'}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-60 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {headerActions}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {headerSection}
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-100 border-b border-gray-200" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-white border-b border-gray-100" />
            ))}
          </div>
        ) : data.length === 0 && !showTableWhenEmpty ? (
          <div className="p-12 text-center">
            {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
            <p className="text-gray-500 text-sm">{emptyMessage}</p>
          </div>
        ) : (
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
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
                      onRowClick ? 'cursor-pointer' : ''
                    } ${rowClassName ? rowClassName(row, globalIndex) : ''}`}
                    onClick={() => onRowClick?.(row, globalIndex)}
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
                        {(() => {
                          const cellValue = (row as Record<string, unknown>)[column.key];
                          return column.render
                            ? column.render(cellValue, row, globalIndex)
                            : renderDefaultCell(cellValue);
                        })()}
                      </td>
                    ))}

                    {/* Actions Cell */}
                    {allActions.length > 0 && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Thao tác"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenu.Trigger>

                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-[11000]"
                                align="end"
                                sideOffset={5}
                              >
                                {allActions.map((action, actionIndex) => {
                                  // Check if action should be shown
                                  if (action.show && !action.show(row)) {
                                    return null;
                                  }

                                  return (
                                    <DropdownMenu.Item
                                      key={actionIndex}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer outline-none transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick(row, globalIndex);
                                      }}
                                    >
                                      {action.icon && (
                                        <span
                                          className={
                                            action.variant === 'danger'
                                              ? 'text-red-600'
                                              : action.variant === 'primary'
                                                ? 'text-blue-600'
                                                : 'text-gray-600'
                                          }
                                        >
                                          {action.icon}
                                        </span>
                                      )}
                                      <span
                                        className={
                                          action.variant === 'danger' ? 'text-red-600' : ''
                                        }
                                      >
                                        {action.label}
                                      </span>
                                    </DropdownMenu.Item>
                                  );
                                })}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {currentData.length === 0 && (
                <tr>
                  <td
                    colSpan={1 + columns.length + (allActions.length > 0 ? 1 : 0)}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-600">
            Hiển thị{' '}
            <span className="font-medium text-gray-900">
              {startIndex + 1} - {Math.min(endIndex, totalCount)}
            </span>{' '}
            trong tổng số <span className="font-medium text-gray-900">{totalCount}</span> bản ghi
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => goToPage(activePage - 1)}
              disabled={activePage === 1}
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
                  (page >= activePage - 1 && page <= activePage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        page === activePage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                }
                // Show ellipsis
                if (page === activePage - 2 || page === activePage + 2) {
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
              onClick={() => goToPage(activePage + 1)}
              disabled={activePage === totalPages}
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
