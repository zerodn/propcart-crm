'use client';

import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/use-task';

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-[#CFAF6E]/60',
};

const PRIORITY_BG: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-[#F5F7FA] text-[#0B1F3A] border-[#CFAF6E]/40',
};

interface KanbanCardProps {
  task: Task;
  isDragOverlay?: boolean;
  isOverdue?: boolean;
  priorityLabel?: string;
  categoryLabel?: string;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

function KanbanCardInner({
  task,
  isDragOverlay,
  isOverdue,
  priorityLabel,
  categoryLabel,
  onEdit,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const assigneeName =
    task.assignedUser?.fullName ||
    task.assignedUser?.phone ||
    null;

  const assigneeInitial = assigneeName
    ? assigneeName.charAt(0).toUpperCase()
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing',
        'hover:border-[#CFAF6E] hover:shadow-md transition-all duration-150',
        isDragging && 'opacity-30 shadow-none',
        isDragOverlay && 'shadow-xl border-[#CFAF6E] rotate-[2deg] scale-[1.02]',
        isOverdue && 'border-l-[3px] border-l-red-400',
      )}
      {...listeners}
      {...attributes}
    >
      {/* Grip handle */}
      <div className="absolute top-2 right-1.5 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Title — clickable to edit */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(task);
        }}
        className="text-sm font-medium text-gray-900 text-left line-clamp-2 leading-snug hover:text-[#CFAF6E] transition-colors w-full"
      >
        {task.title}
      </button>

      {/* Customer */}
      {task.customer && (
        <p className="mt-1 text-xs text-gray-500 truncate">
          {task.customer.fullName}
        </p>
      )}

      {/* Meta row: priority + category */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.priority && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
              PRIORITY_BG[task.priority] || 'bg-gray-50 text-gray-600 border-gray-200',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[task.priority] || 'bg-gray-400')} />
            {priorityLabel || task.priority}
          </span>
        )}
        {categoryLabel && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Bottom row: due date + assignee */}
      <div className="mt-2 flex items-center justify-between">
        {task.dueDate ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px]',
              isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500',
            )}
          >
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
            })}
          </span>
        ) : (
          <span />
        )}

        {assigneeInitial && (
          <span
            className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#CFAF6E]/15 text-[#0B1F3A] text-[10px] font-semibold"
            title={assigneeName || ''}
          >
            {assigneeInitial}
          </span>
        )}
        {!assigneeInitial && task.assignedUserId && (
          <User className="h-4 w-4 text-gray-300" />
        )}
      </div>
    </div>
  );
}

export const KanbanCard = memo(KanbanCardInner);
