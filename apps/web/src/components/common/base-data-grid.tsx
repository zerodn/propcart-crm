'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight, MoreVertical, Search } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useI18n } from '@/providers/i18n-provider';
import { cn } from '@/lib/utils';

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
  emptyMessage,
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
  const { t } = useI18n();
  const displayEmptyMessage = emptyMessage ?? t('grid.empty');

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
    <div className="glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4">
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
          {titleIcon}
          {title}
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="bg-[#CFAF6E]/15 text-[#0B1F3A] dark:text-[#CFAF6E] text-xs px-1.5 py-0.5 rounded-full">
              {badgeCount}
            </span>
          )}
        </h3>
      )}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ml-auto">
        {onSearchChange !== undefined && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
            <input
              type="text"
              placeholder={searchPlaceholder ?? 'Tìm kiếm...'}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-60 pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-white/15 rounded-lg bg-white/90 dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]/50 focus:border-[#CFAF6E]"
            />
          </div>
        )}
        {headerActions}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col">
      <div className={cn('glass-content-card overflow-hidden', !isLoading && totalPages > 1 ? 'rounded-t-xl' : 'rounded-xl')}>
        {headerSection}
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-100/70 dark:bg-white/5 border-b border-gray-200/60 dark:border-white/10" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-white/50 dark:bg-white/[0.02] border-b border-gray-100/60 dark:border-white/[0.05]" />
            ))}
          </div>
        ) : data.length === 0 && !showTableWhenEmpty ? (
          <div className="p-12 text-center">
            {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
            <p className="text-gray-500 text-sm">{displayEmptyMessage}</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 dark:bg-white/[0.04] border-b border-gray-200/70 dark:border-white/10">
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
                    {t('common.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80 dark:divide-white/[0.06]">
              {currentData.map((row, rowIndex) => {
                const globalIndex = startIndex + rowIndex;
                return (
                  <tr
                    key={globalIndex}
                    className={`hover:bg-[#CFAF6E]/[0.04] dark:hover:bg-white/[0.04] transition-colors ${
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
                                title={t('common.actions')}
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
                                                ? 'text-[#CFAF6E]'
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
                    {displayEmptyMessage}
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
        <div className="glass-content-card rounded-b-xl border-t border-gray-200/60 dark:border-white/10 flex items-center justify-between px-4 py-3 -mt-px">
          <div className="text-sm text-gray-600 dark:text-white/60">
            Hiển thị{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {startIndex + 1} - {Math.min(endIndex, totalCount)}
            </span>{' '}
            trong tổng số <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> bản ghi
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => goToPage(activePage - 1)}
              disabled={activePage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-white/70 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                          ? 'bg-[#CFAF6E] text-white shadow-sm shadow-[#CFAF6E]/30'
                          : 'text-gray-700 dark:text-white/70 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/15'
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
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-white/70 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
