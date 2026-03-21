'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Reply, Pencil, Trash2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { CustomerComment } from '@/hooks/use-customer';

interface MemberOption {
  value: string;  // userId
  label: string;  // display name (fallback for old code)
}

interface ESMember {
  userId: string;
  displayName?: string | null;
  name?: string | null;          // API sometimes returns name instead of displayName
  employeeCode?: string | null;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

function getMemberInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// ─── Comment Input (supports @mentions via Elasticsearch) ─────────────────────
interface CommentInputProps {
  placeholder: string;
  onSubmit: (content: string, mentions: string[]) => Promise<void>;
  isLoading?: boolean;
  workspaceId: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  showCancel?: boolean;
  rows?: number;
}

function CommentInput({
  placeholder,
  onSubmit,
  isLoading,
  workspaceId,
  autoFocus,
  onCancel,
  showCancel,
  rows = 2,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionResults, setMentionResults] = useState<ESMember[]>([]);
  const [isMentionLoading, setIsMentionLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Track name → userId for mentions inserted in this input session
  const mentionedUsersRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  // Debounce ES search when mentionQuery changes
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.trim() === '') {
      setMentionResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsMentionLoading(true);
      try {
        const res = await apiClient.get<{ data?: ESMember[] }>(
          `/workspaces/${workspaceId}/departments/member-search?q=${encodeURIComponent(mentionQuery)}`,
        );
        const raw = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
        const mapped: ESMember[] = raw.map((m: ESMember) => ({
          ...m,
          displayName: m.displayName || m.name || null,
        }));
        setMentionResults(mapped.slice(0, 8));
      } catch {
        setMentionResults([]);
      } finally {
        setIsMentionLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [mentionQuery, workspaceId]);

  // Detect @mention typing
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const caret = e.target.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const atIdx = before.lastIndexOf('@');

    if (atIdx !== -1 && !before.slice(atIdx).includes(' ')) {
      setMentionQuery(before.slice(atIdx + 1));
      setMentionStart(atIdx);
      // Compute dropdown position relative to viewport (fixed)
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.top - 4, left: rect.left, width: rect.width });
      }
    } else {
      setMentionQuery(null);
      setMentionStart(null);
      setDropdownPos(null);
    }
  };

  const handleMentionSelect = (member: ESMember) => {
    if (mentionStart === null) return;
    const displayName = member.displayName || member.name || member.userId;
    const before = content.slice(0, mentionStart);
    const after = content.slice(inputRef.current?.selectionStart ?? content.length);
    const newContent = `${before}@${displayName} ${after}`;
    setContent(newContent);
    mentionedUsersRef.current.set(displayName, member.userId);
    setMentionQuery(null);
    setMentionStart(null);
    setMentionResults([]);
    setDropdownPos(null);
    inputRef.current?.focus();
  };

  const extractMentions = (text: string): string[] => {
    const found: string[] = [];
    for (const [name, userId] of mentionedUsersRef.current.entries()) {
      if (text.includes(`@${name}`)) found.push(userId);
    }
    return [...new Set(found)];
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const mentions = extractMentions(trimmed);
    await onSubmit(trimmed, mentions);
    setContent('');
    setMentionQuery(null);
    mentionedUsersRef.current.clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setMentionQuery(null);
      setDropdownPos(null);
      onCancel?.();
    }
  };

  const showDropdown = mentionQuery !== null && (mentionResults.length > 0 || isMentionLoading);

  // Portal dropdown — rendered to body so it escapes all overflow:hidden parents
  const dropdown = showDropdown && dropdownPos
    ? createPortal(
        <div
          className="z-[9999] w-72 rounded-lg border border-gray-200 bg-white shadow-xl dark:bg-gray-800 dark:border-gray-700 overflow-hidden"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: Math.max(dropdownPos.width, 288),
            transform: 'translateY(-100%)',
          }}
        >
          {isMentionLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : (
            mentionResults.map((m) => {
              const name = m.displayName || m.name || m.userId;
              const initials = getMemberInitials(name);
              return (
                <button
                  key={m.userId}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMentionSelect(m);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 text-left"
                >
                  <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</span>
                      {m.employeeCode && (
                        <span className="shrink-0 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1 rounded">
                          {m.employeeCode}
                        </span>
                      )}
                    </div>
                    {(m.phone || m.email) && (
                      <div className="text-xs text-gray-400 truncate">
                        {[m.phone, m.email].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative">
      {dropdown}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
          />

          {/* dropdown is rendered via portal above — no inline dropdown here */}
        </div>

        <div className="flex gap-1.5 justify-end">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !content.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">Ctrl+Enter để gửi • Gõ @ để tag người</p>
    </div>
  );
}

// ─── Render comment content with @mentions highlighted ────────────────────────
function CommentContent({ content }: { content: string }) {
  const parts = content.split(/(@\S+(?:\s\S+)*?)(?=\s|$|@)/g);
  // Simpler split: highlight tokens that start with @
  const tokens = content.split(/(\s+)/);
  return (
    <span>
      {content.split(/(@[\w\u00C0-\u024F\u1E00-\u1EFF]+(?:\s[\w\u00C0-\u024F\u1E00-\u1EFF]+)*)/g).map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-blue-600 font-medium">{part}</span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

// ─── Single Comment Item ───────────────────────────────────────────────────────
interface CommentItemProps {
  comment: CustomerComment;
  currentUserId: string;
  workspaceId: string;
  memberOptions: MemberOption[];
  onReply: (parentId: string, content: string, mentions: string[]) => Promise<void>;
  onEdit: (commentId: string, content: string, mentions: string[]) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isSubmitting?: boolean;
  /** The root-level comment id — replies at any depth always target this id */
  rootId?: string;
}

function CommentItem({
  comment,
  currentUserId,
  workspaceId,
  memberOptions,
  onReply,
  onEdit,
  onDelete,
  isSubmitting,
  rootId,
}: CommentItemProps) {
  // Replies always attach to the root-level comment (2-level flat thread)
  const replyTargetId = rootId ?? comment.id;
  const { t } = useI18n();
  const [showReply, setShowReply] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAuthor = comment.authorId === currentUserId;
  const authorName =
    comment.author?.fullName ||
    memberOptions.find((m) => m.value === comment.authorId)?.label ||
    'Ẩn danh';

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const avatar = comment.author?.avatarUrl;
  const initials = authorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex gap-3" data-comment-id={comment.id}>
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
        {avatar ? (
          <img src={avatar} alt={authorName} className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full break-words">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mr-2">{authorName}</span>
          {editMode ? (
            <div className="mt-1">
              <CommentInput
                placeholder="Chỉnh sửa bình luận..."
                onSubmit={async (content, mentions) => {
                  await onEdit(comment.id, content, mentions);
                  setEditMode(false);
                }}
                isLoading={isSubmitting}
                workspaceId={workspaceId}
                autoFocus
                showCancel
                onCancel={() => setEditMode(false)}
              />
            </div>
          ) : (
            <span className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
              <CommentContent content={comment.content} />
            </span>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3 mt-1 ml-1">
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
          <button
            type="button"
            onClick={() => setShowReply((v) => !v)}
            className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Reply className="h-3 w-3" />
            {t('customer.comment.reply')}
          </button>

          {isAuthor && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-6 z-30 w-28 rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setEditMode(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('customer.comment.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDelete(comment.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('customer.comment.delete')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                workspaceId={workspaceId}
                memberOptions={memberOptions}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                isSubmitting={isSubmitting}
                rootId={rootId ?? comment.id}
              />
            ))}
          </div>
        )}

        {/* Reply Input */}
        {showReply && (
          <div className="mt-3">
            <CommentInput
              placeholder={t('customer.comment.replyPlaceholder')}
              onSubmit={async (content, mentions) => {
                await onReply(replyTargetId, content, mentions);
                setShowReply(false);
              }}
              isLoading={isSubmitting}
              workspaceId={workspaceId}
              autoFocus
              showCancel
              onCancel={() => setShowReply(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main CustomerCommentTab ───────────────────────────────────────────────────
interface CustomerCommentTabProps {
  customerId: string;
  workspaceId: string;
  memberOptions?: MemberOption[];
  listComments: (id: string) => Promise<{ data: CustomerComment[] }>;
  createComment: (
    id: string,
    payload: { content: string; parentId?: string; mentions?: string[] },
  ) => Promise<unknown>;
  updateComment: (
    id: string,
    commentId: string,
    payload: { content: string; mentions?: string[] },
  ) => Promise<unknown>;
  deleteComment: (id: string, commentId: string) => Promise<void>;
}

export function CustomerCommentTab({
  customerId,
  workspaceId,
  memberOptions = [],
  listComments,
  createComment,
  updateComment,
  deleteComment,
}: CustomerCommentTabProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [comments, setComments] = useState<CustomerComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<'top' | string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll after a new comment/reply is added
  useEffect(() => {
    if (!scrollTarget || !listRef.current) return;
    const container = listRef.current;
    if (scrollTarget === 'top') {
      container.scrollTop = 0;
    } else {
      const el = container.querySelector(`[data-comment-id="${scrollTarget}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    setScrollTarget(null);
  }, [scrollTarget]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listComments(customerId);
      setComments(res.data || []);
    } catch {
      toast.error(t('customer.comment.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, listComments]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (content: string, mentions: string[]) => {
    setIsSubmitting(true);
    try {
      await createComment(customerId, { content, mentions });
      await load();
      setScrollTarget('top');
    } catch {
      toast.error(t('customer.comment.addError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string, mentions: string[]) => {
    setIsSubmitting(true);
    try {
      await createComment(customerId, { content, parentId, mentions });
      await load();
      setScrollTarget(parentId);
    } catch {
      toast.error(t('customer.comment.addError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string, content: string, mentions: string[]) => {
    setIsSubmitting(true);
    try {
      await updateComment(customerId, commentId, { content, mentions });
      await load();
    } catch {
      toast.error(t('customer.comment.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setIsSubmitting(true);
    try {
      await deleteComment(customerId, commentId);
      await load();
    } catch {
      toast.error(t('customer.comment.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reversedComments = [...comments].reverse();

  return (
    <div className="flex gap-0 h-[480px]">
      {/* ── Left: Write panel ───────────────────────────────────── */}
      <div className="w-[240px] shrink-0 flex flex-col gap-3 border-r border-gray-200 dark:border-gray-700 pr-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          Viết bình luận
        </p>

        <div className="flex-1 flex flex-col">
          <CommentInput
            placeholder={t('customer.comment.placeholder')}
            onSubmit={handleCreate}
            isLoading={isSubmitting}
            workspaceId={workspaceId}
            rows={6}
          />
        </div>
      </div>

      {/* ── Right: Comment list ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 pl-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          Bình luận
          {comments.length > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold normal-case leading-none">
              {comments.length}
            </span>
          )}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : reversedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">{t('customer.comment.empty')}</span>
          </div>
        ) : (
          <div ref={listRef} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {reversedComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={user?.id || ''}
                workspaceId={workspaceId}
                memberOptions={memberOptions}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

