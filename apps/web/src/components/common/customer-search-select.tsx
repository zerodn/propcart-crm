'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

export interface CustomerSearchResult {
  id: string;
  fullName: string;
  phone?: string | null;
  code?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface CustomerSearchSelectProps {
  workspaceId: string;
  label?: string;
  placeholder?: string;
  value: string; // customerId
  onChange: (id: string, customer?: CustomerSearchResult) => void;
  disabled?: boolean;
  initialCustomer?: CustomerSearchResult | null;
}

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

export function CustomerSearchSelect({
  workspaceId,
  label,
  placeholder = 'Tìm theo tên, SĐT, mã KH...',
  value,
  onChange,
  disabled,
  initialCustomer,
}: CustomerSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [cache, setCache] = useState<Map<string, CustomerSearchResult>>(() => {
    const m = new Map<string, CustomerSearchResult>();
    if (initialCustomer) m.set(initialCustomer.id, initialCustomer);
    return m;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialCustomer into cache when it changes (e.g. different demand opened)
  useEffect(() => {
    if (!initialCustomer) return;
    setCache((prev) => {
      if (prev.has(initialCustomer.id)) return prev;
      const next = new Map(prev);
      next.set(initialCustomer.id, initialCustomer);
      return next;
    });
  }, [initialCustomer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get<{ data: CustomerSearchResult[] }>(
          `/workspaces/${workspaceId}/customers?search=${encodeURIComponent(query)}&limit=10`,
        );
        const raw: CustomerSearchResult[] = Array.isArray(res?.data)
          ? res.data
          : (res?.data?.data ?? []);
        setCache((prev) => {
          const next = new Map(prev);
          raw.forEach((c) => next.set(c.id, c));
          return next;
        });
        setResults(raw);
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

  const selected = cache.get(value);
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  const handleSelect = (customer: CustomerSearchResult) => {
    setCache((prev) => new Map(prev).set(customer.id, customer));
    onChange(customer.id === value ? '' : customer.id, customer);
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

          {selected && !open ? (
            // Show selected customer chip
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-5 w-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[9px] font-semibold overflow-hidden shrink-0">
                {selected.avatarUrl ? (
                  <img src={selected.avatarUrl} alt={selected.fullName} className="h-full w-full object-cover" />
                ) : (
                  <span>{getInitials(selected.fullName)}</span>
                )}
              </div>
              <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{selected.fullName}</span>
              {selected.phone && (
                <span className="text-gray-400 text-xs shrink-0">• {selected.phone}</span>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto p-0.5 rounded hover:bg-gray-200 text-gray-400 shrink-0"
                aria-label="Xóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={selected ? selected.fullName : placeholder}
              className="flex-1 min-w-0 bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm"
              disabled={disabled}
            />
          )}

          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 w-full min-w-[280px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            {results.length === 0 && !isSearching && (
              <div className="flex flex-col items-center gap-1 py-5 text-center text-sm text-gray-400">
                <UserRound className="h-6 w-6 opacity-40" />
                {query.trim() ? 'Không tìm thấy khách hàng' : 'Nhập tên, SĐT hoặc mã KH để tìm kiếm'}
              </div>
            )}
            {isSearching && results.length === 0 && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            {results.map((customer) => {
              const isSelected = customer.id === value;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F5F7FA] dark:hover:bg-gray-700 transition-colors',
                    isSelected && 'bg-[#F5F7FA] dark:bg-gray-700',
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
                    {customer.avatarUrl ? (
                      <img src={customer.avatarUrl} alt={customer.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{getInitials(customer.fullName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{customer.fullName}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                      {customer.phone && <span>{customer.phone}</span>}
                      {customer.code && <span className="text-gray-400">#{customer.code}</span>}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-[#F5F7FA]0 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
