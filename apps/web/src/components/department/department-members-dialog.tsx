'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import type { Department, DepartmentMemberOption, DepartmentRoleOption } from '@/hooks/use-department';

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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowLoadingKey, setRowLoadingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<DepartmentMemberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
    setRowLoadingKey(`remove-${userId}`);
    try {
      await onRemoveMember(department.id, userId);
    } finally {
      setRowLoadingKey(null);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    setRowLoadingKey(`role-${userId}`);
    try {
      await onUpdateMemberRole(department.id, userId, roleId);
    } finally {
      setRowLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nhân sự phòng: {department.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Mã phòng: {department.code}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting || isLoading}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 border-b border-gray-200 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Thêm nhân sự vào phòng</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Autocomplete member search */}
            <div className="relative">
              <div className="relative">
                <input
                  ref={userInputRef}
                  type="text"
                  placeholder="Tìm theo SĐT, email..."
                  value={
                    selectedUserId
                      ? memberOptions.find((m) => m.userId === selectedUserId)?.phone ||
                        memberOptions.find((m) => m.userId === selectedUserId)?.email ||
                        searchQuery
                      : searchQuery
                  }
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                      Đang tìm kiếm...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {searchQuery ? 'Không tìm thấy nhân sự' : 'Nhập để tìm kiếm'}
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
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{member.phone || member.email}</div>
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
              <option value="">Chọn quyền</option>
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
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Thêm nhân sự
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Danh sách nhân sự ({department.members?.length || 0})</h3>
          {(!department.members || department.members.length === 0) && (
            <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              Chưa có nhân sự trong phòng ban này.
            </div>
          )}

          <div className="space-y-2">
            {department.members?.map((member) => {
              const keyRemove = `remove-${member.userId}`;
              const keyRole = `role-${member.userId}`;
              const isRowLoading = rowLoadingKey === keyRemove || rowLoadingKey === keyRole;

              return (
                <div
                  key={member.userId}
                  className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] items-center gap-3 border border-gray-200 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user?.phone || member.user?.email || member.userId}
                    </p>
                  </div>

                  <select
                    value={member.roleId}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value)}
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
                    {isRowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Xóa
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
