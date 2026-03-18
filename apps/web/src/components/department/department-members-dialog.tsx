'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Plus, Trash2, ChevronDown } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BaseDialog } from '@/components/common/base-dialog';
import { useI18n } from '@/providers/i18n-provider';
import type {
  Department,
  DepartmentMemberOption,
  DepartmentRoleOption,
} from '@/hooks/use-department';

interface DepartmentMembersDialogProps {
  isOpen: boolean;
  department: Department | null;
  memberOptions: DepartmentMemberOption[];
  roleOptions: DepartmentRoleOption[];
  isLoading?: boolean;
  onClose: () => void;
  onAddMember: (departmentId: string, userId: string, roleId: string) => Promise<void>;
  onRemoveMember: (departmentId: string, userId: string) => Promise<void>;
  onUpdateMemberRole: (departmentId: string, userId: string, roleId: string) => Promise<void>;
  onSearchMembers?: (query: string) => Promise<DepartmentMemberOption[]>;
}

export function DepartmentMembersDialog({
  isOpen,
  department,
  memberOptions,
  roleOptions,
  isLoading = false,
  onClose,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  onSearchMembers,
}: DepartmentMembersDialogProps) {
  const { t } = useI18n();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowLoadingKey, setRowLoadingKey] = useState<string | null>(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, string>>({}); // userId → newRoleId
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<DepartmentMemberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    memberName: string;
  } | null>(null);
  const userInputRef = useRef<HTMLInputElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentMemberIds = useMemo(
    () => new Set((department?.members || []).map((member) => member.userId)),
    [department?.members],
  );

  // Server-side search effect
  useEffect(() => {
    if (!onSearchMembers || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await onSearchMembers(searchQuery);
        // Filter out already added members
        const filtered = results.filter((member) => !currentMemberIds.has(member.userId));
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, onSearchMembers, currentMemberIds]);

  // Handle ESC key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        userInputRef.current &&
        !userDropdownRef.current.contains(e.target as Node) &&
        !userInputRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserDropdown]);

  if (!isOpen || !department) return null;

  const handleAddMember = async () => {
    if (!selectedUserId || !selectedRoleId) return;
    setSubmitting(true);
    try {
      await onAddMember(department.id, selectedUserId, selectedRoleId);
      setSelectedUserId('');
      setSelectedRoleId('');
      setSearchQuery('');
      setShowUserDropdown(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const member = department?.members?.find((m) => m.userId === userId);
    const memberName =
      member?.workspaceMember?.displayName ||
      member?.workspaceMember?.workspacePhone ||
      member?.user?.phone ||
      member?.user?.email ||
      userId;
    setMemberToRemove({ userId, memberName });
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRowLoadingKey(`remove-${memberToRemove.userId}`);
    try {
      await onRemoveMember(department!.id, memberToRemove.userId);
      setShowRemoveConfirm(false);
      setMemberToRemove(null);
    } finally {
      setRowLoadingKey(null);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    setRowLoadingKey(`role-${userId}`);
    try {
      await onUpdateMemberRole(department.id, userId, roleId);
      setPendingRoleChanges((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } finally {
      setRowLoadingKey(null);
    }
  };

  const handleCancelRoleChange = (userId: string) => {
    setPendingRoleChanges((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  return (
    <>
      <BaseDialog
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="3xl"
        disableClose={submitting || isLoading}
        headerContent={
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('departments.membersDialog.headerTitle', { name: department.name })}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('departments.membersDialog.headerCode', { code: department.code })}</p>
          </div>
        }
      >
        <div className="flex flex-col -mx-6 -my-5">
          {/* Add Member Form Section */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('departments.membersDialog.addSectionTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Autocomplete member search */}
              <div className="relative">
                <div className="relative">
              {(() => {
                const displayValue = selectedUserId
                  ? (() => {
                      const m = memberOptions.find((m) => m.userId === selectedUserId);
                      return m?.displayName || m?.phone || m?.email || searchQuery;
                    })()
                  : searchQuery;
                return (
                  <input
                    ref={userInputRef}
                    type="text"
                    placeholder={t('departments.membersDialog.searchPlaceholder')}
                    value={displayValue}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                );
              })()}
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Dropdown list */}
                {showUserDropdown && (
                  <div
                    ref={userDropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                  >
                    {isSearching ? (
                      <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('departments.membersDialog.searching')}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {searchQuery ? t('departments.membersDialog.notFound') : t('departments.membersDialog.typeToSearch')}
                      </div>
                    ) : (
                      searchResults.map((member) => (
                        <button
                          key={member.userId}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(member.userId);
                            setShowUserDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">
                            {member.displayName || member.phone || member.email}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {member.employeeCode && (
                              <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {member.employeeCode}
                              </span>
                            )}
                            {member.phone && (
                              <span className="text-xs text-gray-400">{member.phone}</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('departments.membersDialog.selectRolePlaceholder')}</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAddMember}
                disabled={!selectedUserId || !selectedRoleId || submitting}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t('departments.membersDialog.addBtn')}
              </button>
            </div>
          </div>

          {/* Members List Section */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('departments.membersDialog.memberListTitle', { count: department.members?.length || 0 })}
            </h3>
            {(!department.members || department.members.length === 0) && (
              <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                {t('departments.membersDialog.noMembersYet')}
              </div>
            )}

            <div className="space-y-2">
              {department.members?.map((member) => {
                const keyRemove = `remove-${member.userId}`;
                const keyRole = `role-${member.userId}`;
                const isRowLoading = rowLoadingKey === keyRemove || rowLoadingKey === keyRole;
                const hasPendingRole = pendingRoleChanges[member.userId] !== undefined;
                const displayName =
                  member.workspaceMember?.displayName ||
                  member.user?.phone ||
                  member.user?.email ||
                  member.userId;
                const phone =
                  member.workspaceMember?.workspacePhone || member.user?.phone;
                const employeeCode = member.workspaceMember?.employeeCode;

                return (
                  <div key={member.userId} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {employeeCode && (
                            <span className="text-xs text-gray-500 font-mono">{employeeCode}</span>
                          )}
                          {phone && displayName !== phone && (
                            <span className="text-xs text-gray-400">{phone}</span>
                          )}
                        </div>
                      </div>

                      <select
                        value={
                          hasPendingRole
                            ? pendingRoleChanges[member.userId]
                            : member.roleId
                        }
                        onChange={(e) => {
                          const newRoleId = e.target.value;
                          if (newRoleId !== member.roleId) {
                            setPendingRoleChanges((prev) => ({
                              ...prev,
                              [member.userId]: newRoleId,
                            }));
                          }
                        }}
                        disabled={isRowLoading}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={isRowLoading}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        {isRowLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {t('departments.membersDialog.removeBtn')}
                      </button>
                    </div>

                    {/* Role change confirm panel */}
                    {hasPendingRole && !isRowLoading && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
                        <p className="text-xs font-medium text-amber-800">
                          {t('departments.membersDialog.roleChangeWarning')}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleRoleChange(member.userId, pendingRoleChanges[member.userId])
                            }
                            className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors"
                          >
                            {t('departments.membersDialog.roleChangeConfirm')}
                          </button>
                          <button
                            onClick={() => handleCancelRoleChange(member.userId)}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </BaseDialog>

      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title={t('departments.membersDialog.deleteMemberTitle')}
        message={t('departments.membersDialog.deleteMemberConfirm', { name: memberToRemove?.memberName || '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous
        isLoading={rowLoadingKey?.startsWith('remove-') ?? false}
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          setShowRemoveConfirm(false);
          setMemberToRemove(null);
        }}
      />
    </>
  );
}
