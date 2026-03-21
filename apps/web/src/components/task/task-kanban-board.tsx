'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { ListChecks, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/use-task';
import { KanbanCard } from './task-kanban-card';
import { useI18n } from '@/providers/i18n-provider';

/* ------------------------------------------------------------------ */
/*  Status column definitions                                         */
/* ------------------------------------------------------------------ */

const STATUS_COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const;

const STATUS_ACCENT: Record<string, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-[#F5F7FA]0',
  REVIEW: 'bg-purple-500',
  DONE: 'bg-green-500',
  CANCELLED: 'bg-red-400',
};

const STATUS_BG: Record<string, string> = {
  TODO: 'bg-slate-50',
  IN_PROGRESS: 'bg-[#F5F7FA]/50',
  REVIEW: 'bg-purple-50/50',
  DONE: 'bg-green-50/50',
  CANCELLED: 'bg-red-50/40',
};

const COLUMN_RING: Record<string, string> = {
  TODO: 'ring-slate-300',
  IN_PROGRESS: 'ring-[#CFAF6E]/50',
  REVIEW: 'ring-purple-300',
  DONE: 'ring-green-300',
  CANCELLED: 'ring-red-300',
};

/* ------------------------------------------------------------------ */
/*  Droppable Column                                                  */
/* ------------------------------------------------------------------ */

interface ColumnProps {
  status: string;
  tasks: Task[];
  isOverdue: (task: Task) => boolean;
  resolvePriorityLabel: (p: string) => string;
  resolveCategoryLabel: (c: string) => string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isDragActive: boolean;
}

function KanbanColumn({
  status,
  tasks,
  isOverdue,
  resolvePriorityLabel,
  resolveCategoryLabel,
  onEdit,
  isDragActive,
}: ColumnProps) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl min-w-[280px] w-[280px] max-h-full shrink-0',
        'border border-gray-200',
        STATUS_BG[status] || 'bg-gray-50',
        isOver && isDragActive && 'ring-2 ring-offset-1',
        isOver && isDragActive && (COLUMN_RING[status] || 'ring-gray-300'),
        'transition-all duration-150',
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200/80">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_ACCENT[status] || 'bg-gray-400')} />
        <h3 className="text-sm font-semibold text-gray-700 truncate">
          {t(`task.status.${status}` as never) || status}
        </h3>
        <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-white/80 text-[11px] font-medium text-gray-500 border border-gray-200">
          {tasks.length}
        </span>
      </div>

      {/* Cards area — scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-8 text-center',
              'rounded-lg border-2 border-dashed border-gray-200/80',
              isOver && isDragActive && 'border-[#CFAF6E] bg-[#F5F7FA]/30',
            )}
          >
            <ListChecks className="h-6 w-6 text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">
              {t('task.kanban.dropHere')}
            </p>
          </div>
        )}

        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            isOverdue={isOverdue(task)}
            priorityLabel={task.priority ? resolvePriorityLabel(task.priority) : undefined}
            categoryLabel={task.category ? resolveCategoryLabel(task.category) : undefined}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Board (main export)                                        */
/* ------------------------------------------------------------------ */

interface KanbanBoardProps {
  tasks: Task[];
  isOverdue: (task: Task) => boolean;
  resolvePriorityLabel: (p: string) => string;
  resolveCategoryLabel: (c: string) => string;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskKanbanBoard({
  tasks,
  isOverdue,
  resolvePriorityLabel,
  resolveCategoryLabel,
  onStatusChange,
  onEdit,
  onDelete,
}: KanbanBoardProps) {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const s of STATUS_COLUMNS) groups[s] = [];
    for (const task of tasks) {
      const s = task.status || 'TODO';
      if (!groups[s]) groups[s] = [];
      groups[s].push(task);
    }
    // Sort each column: overdue first, then by dueDate asc, then createdAt desc
    for (const s of STATUS_COLUMNS) {
      groups[s].sort((a, b) => {
        const aOverdue = isOverdue(a) ? 0 : 1;
        const bOverdue = isOverdue(b) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return groups;
  }, [tasks, isOverdue]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  // Sensors: pointer with 8px activation distance (prevents click conflicts)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = String(active.id);
      const overId = String(over.id);

      // Determine which column it was dropped on
      let newStatus: string | null = null;
      if (overId.startsWith('column-')) {
        newStatus = overId.replace('column-', '');
      }

      if (!newStatus) return;

      // Find the task's current status
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      // Execute status change (parent handles optimistic update)
      await onStatusChange(taskId, newStatus);
    },
    [tasks, onStatusChange],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      {/* Horizontal scroll container */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1" style={{ minHeight: '400px' }}>
        {STATUS_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] || []}
            isOverdue={isOverdue}
            resolvePriorityLabel={resolvePriorityLabel}
            resolveCategoryLabel={resolveCategoryLabel}
            onEdit={onEdit}
            onDelete={onDelete}
            isDragActive={!!activeId}
          />
        ))}
      </div>

      {/* Drag overlay — floating card that follows cursor */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            isDragOverlay
            isOverdue={isOverdue(activeTask)}
            priorityLabel={activeTask.priority ? resolvePriorityLabel(activeTask.priority) : undefined}
            categoryLabel={activeTask.category ? resolveCategoryLabel(activeTask.category) : undefined}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
