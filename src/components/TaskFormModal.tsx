import { useEffect, useState, type FormEvent } from 'react';
import type { Priority, Task, TaskList } from '../db/types';
import { Modal } from './Modal';

interface TaskFormModalProps {
  open: boolean;
  initialTask: Task | null;
  lists: TaskList[];
  defaultListId: number | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    priority: Priority;
    dueDate: string | null;
    listId: number;
  }) => Promise<void>;
}

export function TaskFormModal({
  open,
  initialTask,
  lists,
  defaultListId,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [dueDate, setDueDate] = useState('');
  const [listId, setListId] = useState<number>(defaultListId ?? 0);

  useEffect(() => {
    if (open) {
      setTitle(initialTask?.title ?? '');
      setPriority(initialTask?.priority ?? 'media');
      setDueDate(initialTask?.dueDate ?? '');
      setListId(
        initialTask?.listId ?? defaultListId ?? lists[0]?.id ?? 0
      );
    }
  }, [open, initialTask, defaultListId, lists]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !listId) return;
    await onSubmit({
      title,
      priority,
      dueDate: dueDate || null,
      listId,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initialTask ? 'Editar ação' : 'Nova ação'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="task-title">
            O que precisa ser feito?
          </label>
          <input
            id="task-title"
            className="input"
            type="text"
            placeholder="Ex: Pagar conta de luz"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        {lists.length > 0 && (
          <div className="form-group">
            <label className="form-label" htmlFor="task-list">
              Caixa
            </label>
            <select
              id="task-list"
              className="select"
              value={listId}
              onChange={(e) => setListId(Number(e.target.value))}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="task-priority">
            Prioridade
          </label>
          <select
            id="task-priority"
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="task-due">
            Vencimento (opcional)
          </label>
          <input
            id="task-due"
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
