'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberSearchResult {
  userId: string;
  displayName?: string | null;
  employeeCode?: string | null;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  roleName?: string | null;
}

type CommonProps = {
  workspaceId: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Pre-populated display data for currently-selected IDs (avoids blank labels on initial render) */
  initialMembers?: Pick<MemberSearchResult, 'userId' | 'displayName'>[];
};

type SingleProps = CommonProps & {
  mode: 'single';
  value: string;
  onChange: (userId: string) => void;
};

type MultiProps = CommonProps & {
  mode: 'multi';
  values: string[];
  onChange: (userIds: string[]) => void;
};

export type MemberSearchSelectProps = SingleProps | MultiProps;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberSearchSelect(props: MemberSearchSelectProps) {
  const { workspaceId, label, placeholder = 'Tìm kiếm nhân viên...', disabled, initialMembers } = props;

  // Shared state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Cache: userId → full member info (populated from search results + initial members)
  const [memberCache, setMemberCache] = useState<Map<string, MemberSearchResult>>(() => {
    const map = new Map<string, MemberSearchResult>();
    initialMembers?.forEach((m) => map.set(m.userId, m));
    return map;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialMembers into cache when they change (e.g. editing a different customer)
  useEffect(() => {
    if (!initialMembers?.length) return;
    setMemberCache((prev) => {
      const next = new Map(prev);
      initialMembers.forEach((m) => {
        if (!next.has(m.userId)) next.set(m.userId, m);
      });
      return next;
    });
  }, [JSON.stringify(initialMembers?.map((m) => m.userId))]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get<{ data: (MemberSearchResult & { name?: string })[] }>(
          `/workspaces/${workspaceId}/departments/member-search?q=${encodeURIComponent(query)}`,
        );
        const raw = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
        const mapped: MemberSearchResult[] = raw.map((m) => ({
          userId: m.userId,
          displayName: m.displayName || m.name || null,
          employeeCode: m.employeeCode || null,
          phone: m.phone || null,
          email: m.email || null,
          avatarUrl: m.avatarUrl || null,
          roleName: m.roleName || null,
        }));
        // Update cache with fresh results
        setMemberCache((prev) => {
          const next = new Map(prev);
          mapped.forEach((m) => next.set(m.userId, m));
          return next;
        });
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  // ─── Single mode ────────────────────────────────────────────────────────────
  if (props.mode === 'single') {
    const { value, onChange } = props;
    const selected = memberCache.get(value);
    const displayName = selected?.displayName || (value ? value : '');

    const handleSelect = (member: MemberSearchResult) => {
      setMemberCache((prev) => new Map(prev).set(member.userId, member));
      onChange(member.userId === value ? '' : member.userId);
      setQuery('');
      setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setQuery('');
    };

    return (
      <div>
        {label && <label className={labelCls}>{label}</label>}
        <div className="relative" ref={containerRef}>
          <div
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-text focus-within:ring-2 focus-within:ring-[#CFAF6E] focus-within:border-transparent',
              disabled && 'opacity-60 pointer-events-none',
            )}
            onClick={() => !disabled && setOpen(true)}
          >
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={open ? query : displayName}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) onChange('');
              }}
              onFocus={() => { setOpen(true); setQuery(''); }}
              placeholder={value ? displayName : placeholder}
              className="flex-1 border-none bg-transparent p-0 text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              disabled={disabled}
            />
            {value && !open && (
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-gray-700 text-gray-400"
                tabIndex={-1}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown
              className={cn('h-4 w-4 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')}
            />
          </div>

          {open && (
            <DropdownList
              query={query}
              results={results}
              isSearching={isSearching}
              isSelected={(id) => id === value}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    );
  }

  // ─── Multi mode ─────────────────────────────────────────────────────────────
  const { values, onChange } = props;

  const toggleMember = (member: MemberSearchResult) => {
    setMemberCache((prev) => new Map(prev).set(member.userId, member));
    if (values.includes(member.userId)) {
      onChange(values.filter((id) => id !== member.userId));
    } else {
      onChange([...values, member.userId]);
    }
  };

  const removeBadge = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter((id) => id !== userId));
  };

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="relative" ref={containerRef}>
        <div
          className={cn(
            'min-h-[38px] flex flex-wrap gap-1.5 items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-text focus-within:ring-2 focus-within:ring-[#CFAF6E]',
            disabled && 'opacity-60 pointer-events-none',
          )}
          onClick={() => !disabled && setOpen(true)}
        >
          {values.map((id) => {
            const member = memberCache.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CFAF6E]/15 text-[#0B1F3A] text-xs font-medium"
              >
                {member?.displayName || id}
                <button
                  type="button"
                  onClick={(e) => removeBadge(id, e)}
                  className="hover:text-[#0B1F3A]"
                  tabIndex={-1}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          <div className="flex-1 flex items-center gap-1.5 min-w-[120px]">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={values.length === 0 ? placeholder : ''}
              className="flex-1 border-none bg-transparent p-0 text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              disabled={disabled}
            />
            <ChevronDown
              className={cn('h-4 w-4 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')}
            />
          </div>
        </div>

        {open && (
          <DropdownList
            query={query}
            results={results}
            isSearching={isSearching}
            isSelected={(id) => values.includes(id)}
            onSelect={toggleMember}
          />
        )}
      </div>
    </div>
  );
}

// ─── Shared Dropdown ──────────────────────────────────────────────────────────

interface DropdownListProps {
  query: string;
  results: MemberSearchResult[];
  isSearching: boolean;
  isSelected: (userId: string) => boolean;
  onSelect: (member: MemberSearchResult) => void;
}

function DropdownList({ query, results, isSearching, isSelected, onSelect }: DropdownListProps) {
  let content: React.ReactNode;

  if (!query.trim()) {
    content = (
      <div className="px-3 py-4 text-sm text-center text-gray-400">
        Nhập tên, mã, SĐT hoặc email để tìm kiếm
      </div>
    );
  } else if (isSearching) {
    content = (
      <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tìm...
      </div>
    );
  } else if (results.length === 0) {
    content = (
      <div className="px-3 py-4 text-sm text-center text-gray-400">Không tìm thấy nhân viên</div>
    );
  } else {
    content = results.map((member) => {
      const selected = isSelected(member.userId);
      const initials = getInitials(member.displayName);
      return (
        <button
          key={member.userId}
          type="button"
          onClick={() => onSelect(member)}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F5F7FA] dark:hover:bg-gray-700 transition-colors',
            selected && 'bg-[#F5F7FA] dark:bg-gray-700',
          )}
        >
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.displayName ?? ''} className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium text-gray-900 dark:text-gray-100 truncate', selected && 'text-[#CFAF6E]')}>
                {member.displayName || member.userId}
              </span>
              {member.employeeCode && (
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-mono">
                  {member.employeeCode}
                </span>
              )}
            </div>
            {(member.phone || member.email) && (
              <div className="text-xs text-gray-400 truncate mt-0.5">
                {[member.phone, member.email].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          {/* Checkmark */}
          {selected && <Check className="h-4 w-4 text-[#CFAF6E] shrink-0" />}
        </button>
      );
    });
  }

  return (
    <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
      {content}
    </div>
  );
}
