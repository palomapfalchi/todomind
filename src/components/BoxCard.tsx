import { useState, type FormEvent, type PointerEvent } from 'react';
import {
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Pin,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { getBoxIcon } from '../constants/boxes';
import type { Task, TaskList } from '../db/types';

interface BoxCardProps {
  list: TaskList;
  pendingTasks: Task[];
  completedCount: number;
  reorderMode: boolean;
  canMovePrev: boolean;
  canMoveNext: boolean;
  isDropTarget: boolean;
  dropLabel: string | null;
  draggingTaskId: number | null;
  justCompletedTaskId: number | null;
  onOpen: (listId: number) => void;
  onOpenMenu: (list: TaskList) => void;
  onMovePrev: (listId: number) => void;
  onMoveNext: (listId: number) => void;
  onStartTaskDrag: (task: Task, e: PointerEvent<HTMLButtonElement>) => void;
  onToggleTask: (taskId: number, completed: boolean) => void;
  onQuickAdd: (listId: number, title: string) => Promise<void>;
}

const MAX_PREVIEW_ITEMS = 2;

export function BoxCard({
  list,
  pendingTasks,
  completedCount,
  reorderMode,
  canMovePrev,
  canMoveNext,
  isDropTarget,
  dropLabel,
  draggingTaskId,
  justCompletedTaskId,
  onOpen,
  onOpenMenu,
  onMovePrev,
  onMoveNext,
  onStartTaskDrag,
  onToggleTask,
  onQuickAdd,
}: BoxCardProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const Icon = getBoxIcon(list.icon);
  const previewTasks = pendingTasks.slice(0, MAX_PREVIEW_ITEMS);
  const hiddenPending = Math.max(0, pendingTasks.length - MAX_PREVIEW_ITEMS);

  const handleQuickSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed || list.id == null || adding) return;
    setAdding(true);
    try {
      await onQuickAdd(list.id, trimmed);
      setQuickTitle('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className={`box-card ${list.isInbox ? 'box-card-inbox' : ''} ${reorderMode ? 'is-reordering' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
      data-color={list.color || 'blue'}
      data-drop-list-id={list.id}
      onClick={() => {
        if (!reorderMode && list.id != null) {
          onOpen(list.id);
        }
      }}
    >
      {isDropTarget && dropLabel && (
        <div className="box-drop-overlay" aria-hidden="true">
          <span>{dropLabel}</span>
        </div>
      )}

      <div className="box-card-header-stack">
        <div className="box-card-title-row">
          <span className="box-icon-pill" aria-hidden="true">
            <Icon size={13} />
          </span>
          <h2 className="box-card-title" title={list.name}>
            {list.name}
          </h2>
          {list.isReusable && (
            <RotateCcw
              size={11}
              className="reusable-inline-icon"
              aria-label="Caixa reutilizável"
            />
          )}
        </div>

        <div
          className="box-card-subrow"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="box-card-meta">
            {!list.isInbox && list.pinned && (
              <Pin
                size={10}
                className="pinned-inline-icon"
                aria-label="Fixada no topo"
              />
            )}
            {pendingTasks.length === 0
              ? completedCount > 0
                ? `${completedCount} feita${completedCount === 1 ? '' : 's'}`
                : 'Vazia'
              : `${pendingTasks.length} pendente${pendingTasks.length === 1 ? '' : 's'}`}
          </span>

          <div className="box-card-actions">
            {reorderMode ? (
              !list.isInbox ? (
                <>
                  <button
                    type="button"
                    className="icon-btn-xs reorder-arrow-btn"
                    disabled={!canMovePrev}
                    aria-label={`Mover caixa ${list.name} para antes`}
                    title="Mover antes"
                    onClick={() => list.id != null && onMovePrev(list.id)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn-xs reorder-arrow-btn"
                    disabled={!canMoveNext}
                    aria-label={`Mover caixa ${list.name} para depois`}
                    title="Mover depois"
                    onClick={() => list.id != null && onMoveNext(list.id)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              ) : (
                <span className="inbox-fixed-tag">Fixa</span>
              )
            ) : (
              <button
                type="button"
                className="icon-btn-xs"
                aria-label={`Opções da caixa ${list.name}`}
                title="Opções da caixa"
                onClick={() => onOpenMenu(list)}
              >
                <MoreVertical size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="box-card-body">
        {previewTasks.length > 0 ? (
          <ul className="box-preview-list">
            {previewTasks.map((task) => {
              const subtasks = task.subtasks ?? [];
              const doneSub = subtasks.filter((s) => s.completed).length;

              return (
                <li
                  key={task.id}
                  className={`box-preview-item ${draggingTaskId === task.id ? 'is-dragging' : ''} ${justCompletedTaskId === task.id ? 'task-pop' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="box-preview-check-wrap">
                    <input
                      type="checkbox"
                      className="box-preview-check"
                      checked={task.completed}
                      aria-label={`Concluir "${task.title}"`}
                      onChange={(e) =>
                        task.id != null && onToggleTask(task.id, e.target.checked)
                      }
                    />
                  </label>
                  <span
                    className="box-preview-text"
                    onClick={() => {
                      if (!reorderMode && list.id != null) onOpen(list.id);
                    }}
                  >
                    {task.title}
                  </span>
                  {subtasks.length > 0 && (
                    <span className="box-subtask-chip">
                      {doneSub}/{subtasks.length}
                    </span>
                  )}
                  {task.description && task.description.trim().length > 0 && (
                    <AlignLeft
                      size={11}
                      className="box-note-indicator"
                      aria-label="Possui descrição"
                    />
                  )}
                  {task.priority === 'alta' && (
                    <span
                      className="priority-dot priority-dot-alta"
                      title="Prioridade alta"
                      aria-label="Prioridade alta"
                    />
                  )}
                  <button
                    type="button"
                    className="drag-handle-micro"
                    aria-label={`Arrastar "${task.title}" para outra caixa`}
                    title="Arrastar para outra caixa"
                    onPointerDown={(e) => onStartTaskDrag(task, e)}
                  >
                    <GripVertical size={11} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="box-empty-hint">
            {list.isInbox
              ? 'Cabeça leve! Jogue ideias acima.'
              : 'Tudo em dia por aqui.'}
          </p>
        )}

        {hiddenPending > 0 && (
          <span className="box-more-hint">
            +{hiddenPending} {hiddenPending === 1 ? 'ação' : 'ações'}
          </span>
        )}
      </div>

      <form
        className="box-quick-form"
        onSubmit={handleQuickSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          className="box-quick-input"
          placeholder="+ ação rápida"
          aria-label={`Adicionar ação rápida em ${list.name}`}
          value={quickTitle}
          disabled={reorderMode}
          onChange={(e) => setQuickTitle(e.target.value)}
        />
        {quickTitle.trim().length > 0 && !reorderMode && (
          <button
            type="submit"
            className="box-quick-submit"
            aria-label="Adicionar"
            disabled={adding}
          >
            <Plus size={13} />
          </button>
        )}
      </form>
    </article>
  );
}
