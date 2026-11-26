import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { BatteryLow, BatteryMedium, BatteryFull, Clock, Plus, X } from 'lucide-react';
import { createSubtaskId, getLocalDateString } from '../db/repositories';
import {
  ESTIMATED_MINUTES_OPTIONS,
  type EnergyLevel,
  type EstimatedMinutes,
  type Priority,
  type Subtask,
  type Task,
  type TaskList,
} from '../db/types';
import { Modal } from './Modal';

interface TaskFormModalProps {
  open: boolean;
  initialTask: Task | null;
  lists: TaskList[];
  defaultListId: number | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    dueTime: string | null;
    listId: number;
    subtasks: Subtask[];
    estimatedMinutes: EstimatedMinutes | null;
    energy: EnergyLevel | null;
  }) => Promise<void>;
}

const ENERGY_OPTIONS: Array<{
  value: EnergyLevel;
  label: string;
  Icon: typeof BatteryLow;
}> = [
  { value: 'baixa', label: 'Baixa', Icon: BatteryLow },
  { value: 'media', label: 'Média', Icon: BatteryMedium },
  { value: 'alta', label: 'Alta', Icon: BatteryFull },
];

export function TaskFormModal({
  open,
  initialTask,
  lists,
  defaultListId,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [listId, setListId] = useState<number>(defaultListId ?? 0);
  const [estimatedMinutes, setEstimatedMinutes] =
    useState<EstimatedMinutes | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialTask?.title ?? '');
      setDescription(initialTask?.description ?? '');
      setPriority(initialTask?.priority ?? 'media');
      setDueDate(initialTask?.dueDate ?? '');
      setDueTime(initialTask?.dueTime ?? '');
      setListId(initialTask?.listId ?? defaultListId ?? lists[0]?.id ?? 0);
      setEstimatedMinutes(initialTask?.estimatedMinutes ?? null);
      setEnergy(initialTask?.energy ?? null);
      setSubtasks(initialTask?.subtasks ? [...initialTask.subtasks] : []);
      setNewSubtaskTitle('');
    }
  }, [open, initialTask, defaultListId, lists]);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      { id: createSubtaskId(), title: trimmed, completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleSubtaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !listId) return;

    const finalSubtasks = newSubtaskTitle.trim()
      ? [
          ...subtasks,
          {
            id: createSubtaskId(),
            title: newSubtaskTitle.trim(),
            completed: false,
          },
        ]
      : subtasks;

    const normalizedDate = dueDate || (dueTime ? getLocalDateString(0) : null);

    await onSubmit({
      title,
      description,
      priority,
      dueDate: normalizedDate,
      dueTime: normalizedDate && dueTime ? dueTime : null,
      listId,
      subtasks: finalSubtasks,
      estimatedMinutes,
      energy,
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

        <div className="form-row-2">
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
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="task-description">
            Descrição / Nota (opcional)
          </label>
          <textarea
            id="task-description"
            className="input textarea-field"
            rows={2}
            placeholder="Detalhes, links, endereço ou lembretes extras..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="task-due">
              Vencimento (opcional)
            </label>
            <div className="input-with-clear">
              <input
                id="task-due"
                className="input"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setDueTime('');
                }}
              />
              {dueDate && (
                <button
                  type="button"
                  className="icon-btn-sm"
                  aria-label="Limpar data"
                  title="Limpar data"
                  onClick={() => {
                    setDueDate('');
                    setDueTime('');
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-time">
              Horário (opcional)
            </label>
            <div className="input-with-clear">
              <input
                id="task-time"
                className="input"
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  if (e.target.value && !dueDate) {
                    setDueDate(getLocalDateString(0));
                  }
                }}
              />
              {dueTime && (
                <button
                  type="button"
                  className="icon-btn-sm"
                  aria-label="Limpar horário"
                  title="Limpar horário"
                  onClick={() => setDueTime('')}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Tempo estimado (opcional)</span>
          <div className="pill-selector-row">
            {ESTIMATED_MINUTES_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`pill-option ${estimatedMinutes === opt.value ? 'is-selected' : ''}`}
                onClick={() =>
                  setEstimatedMinutes((prev) =>
                    prev === opt.value ? null : opt.value
                  )
                }
              >
                <Clock size={12} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Energia necessária (opcional)</span>
          <div className="pill-selector-row">
            {ENERGY_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`pill-option ${energy === value ? 'is-selected' : ''}`}
                onClick={() =>
                  setEnergy((prev) => (prev === value ? null : value))
                }
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">
            Micropassos / Subtarefas ({subtasks.length})
          </span>

          {subtasks.length > 0 && (
            <ul className="subtask-editor-list">
              {subtasks.map((st) => (
                <li key={st.id} className="subtask-editor-item">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    aria-label={`Concluir passo "${st.title}"`}
                    onChange={(e) =>
                      setSubtasks((prev) =>
                        prev.map((item) =>
                          item.id === st.id
                            ? { ...item, completed: e.target.checked }
                            : item
                        )
                      )
                    }
                  />
                  <span className={st.completed ? 'is-done' : ''}>
                    {st.title}
                  </span>
                  <button
                    type="button"
                    className="icon-btn-xs"
                    aria-label={`Remover passo "${st.title}"`}
                    onClick={() =>
                      setSubtasks((prev) =>
                        prev.filter((item) => item.id !== st.id)
                      )
                    }
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="subtask-add-row">
            <input
              type="text"
              className="input"
              placeholder="Quebrar em um passo pequeno..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
            />
            <button
              type="button"
              className="btn"
              disabled={!newSubtaskTitle.trim()}
              onClick={handleAddSubtask}
            >
              <Plus size={15} />
              <span>Passo</span>
            </button>
          </div>
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
