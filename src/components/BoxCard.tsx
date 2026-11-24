import { useState, type FormEvent } from 'react';
import { Pencil, Pin, Plus } from 'lucide-react';
import { getBoxIcon } from '../constants/boxes';
import type { Task, TaskList } from '../db/types';

interface BoxCardProps {
  list: TaskList;
  pendingTasks: Task[];
  completedCount: number;
  onOpen: (listId: number) => void;
  onEdit: (list: TaskList) => void;
  onTogglePin: (list: TaskList) => void;
  onToggleTask: (taskId: number, completed: boolean) => void;
  onQuickAdd: (listId: number, title: string) => Promise<void>;
}

const MAX_PREVIEW_ITEMS = 5;

export function BoxCard({
  list,
  pendingTasks,
  completedCount,
  onOpen,
  onEdit,
  onTogglePin,
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
    if (!trimmed || !list.id || adding) return;
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
      className={`box-card ${list.isInbox ? 'box-card-inbox' : ''}`}
      data-color={list.color || 'blue'}
      onClick={() => list.id && onOpen(list.id)}
    >
      <div className="box-card-header">
        <div className="box-card-title-wrap">
          <span className="box-icon-pill" aria-hidden="true">
            <Icon size={16} />
          </span>
          <div className="box-title-block">
            <h2 className="box-card-title">{list.name}</h2>
            <span className="box-card-meta">
              {pendingTasks.length === 0
                ? completedCount > 0
                  ? `${completedCount} concluída${completedCount === 1 ? '' : 's'}`
                  : 'Vazia'
                : `${pendingTasks.length} pendente${pendingTasks.length === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>

        <div
          className="box-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {!list.isInbox && (
            <button
              type="button"
              className={`icon-btn-sm ${list.pinned ? 'is-pinned' : ''}`}
              aria-label={list.pinned ? 'Desafixar caixa' : 'Fixar caixa no topo'}
              title={list.pinned ? 'Desafixar' : 'Fixar no topo'}
              onClick={() => onTogglePin(list)}
            >
              <Pin size={15} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn-sm"
            aria-label={`Editar caixa ${list.name}`}
            title="Editar caixa"
            onClick={() => onEdit(list)}
          >
            <Pencil size={15} />
          </button>
        </div>
      </div>

      <div className="box-card-body">
        {previewTasks.length > 0 ? (
          <ul className="box-preview-list">
            {previewTasks.map((task) => (
              <li
                key={task.id}
                className="box-preview-item"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="box-preview-check"
                  checked={task.completed}
                  aria-label={`Concluir "${task.title}"`}
                  onChange={(e) =>
                    task.id && onToggleTask(task.id, e.target.checked)
                  }
                />
                <span
                  className="box-preview-text"
                  onClick={() => list.id && onOpen(list.id)}
                >
                  {task.title}
                </span>
                {task.priority === 'alta' && (
                  <span
                    className="priority-dot priority-dot-alta"
                    title="Prioridade alta"
                    aria-label="Prioridade alta"
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="box-empty-hint">
            {list.isInbox
              ? 'Cabeça leve! Jogue ideias na barra acima.'
              : 'Tudo em dia por aqui.'}
          </p>
        )}

        {hiddenPending > 0 && (
          <span className="box-more-hint">
            +{hiddenPending} ação{hiddenPending === 1 ? '' : 'ões'} na caixa
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
          onChange={(e) => setQuickTitle(e.target.value)}
        />
        {quickTitle.trim().length > 0 && (
          <button
            type="submit"
            className="box-quick-submit"
            aria-label="Adicionar"
            disabled={adding}
          >
            <Plus size={15} />
          </button>
        )}
      </form>
    </article>
  );
}
