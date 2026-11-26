import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Clock,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { getBoxIcon } from '../constants/boxes';
import {
  ENERGY_LABEL,
  PRIORITY_LABEL,
  type EnergyLevel,
  type Priority,
  type Task,
  type TaskList,
} from '../db/types';

interface SearchOverlayProps {
  open: boolean;
  lists: TaskList[];
  tasks: Task[];
  onClose: () => void;
  onToggleTask: (taskId: number, completed: boolean) => void;
  onEditTask: (task: Task) => void;
  onOpenBox: (listId: number) => void;
}

const MAX_TIME_FILTERS = [
  { maxMinutes: 5, label: 'Até 5 min' },
  { maxMinutes: 15, label: 'Até 15 min' },
  { maxMinutes: 30, label: 'Até 30 min' },
];

const ENERGY_FILTERS: Array<{
  value: EnergyLevel;
  label: string;
  Icon: typeof BatteryLow;
}> = [
  { value: 'baixa', label: 'Baixa', Icon: BatteryLow },
  { value: 'media', label: 'Média', Icon: BatteryMedium },
  { value: 'alta', label: 'Alta', Icon: BatteryFull },
];

const PRIORITY_FILTERS: Array<{ value: Priority; label: string }> = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

export function SearchOverlay({
  open,
  lists,
  tasks,
  onClose,
  onToggleTask,
  onEditTask,
  onOpenBox,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const activeListMap = useMemo(() => {
    const map = new Map<number, TaskList>();
    for (const l of lists) {
      if (l.id != null && !l.archivedAt) {
        map.set(l.id, l);
      }
    }
    return map;
  }, [lists]);

  const normalizedQuery = query.trim().toLowerCase();
  const hasFilters =
    normalizedQuery.length > 0 ||
    maxMinutes !== null ||
    energy !== null ||
    priority !== null;

  const matchingBoxes = useMemo(() => {
    if (!normalizedQuery) return [];
    return lists.filter(
      (l) => !l.archivedAt && l.name.toLowerCase().includes(normalizedQuery)
    );
  }, [lists, normalizedQuery]);

  const matchingTasks = useMemo(() => {
    if (!hasFilters) return [];

    return tasks.filter((task) => {
      const box = activeListMap.get(task.listId);
      if (!box) return false;
      if (!showCompleted && task.completed) return false;

      if (maxMinutes !== null) {
        if (!task.estimatedMinutes || task.estimatedMinutes > maxMinutes) {
          return false;
        }
      }

      if (energy !== null && task.energy !== energy) {
        return false;
      }

      if (priority !== null && task.priority !== priority) {
        return false;
      }

      if (normalizedQuery) {
        const inTitle = task.title.toLowerCase().includes(normalizedQuery);
        const inDesc = (task.description ?? '')
          .toLowerCase()
          .includes(normalizedQuery);
        const inBox = box.name.toLowerCase().includes(normalizedQuery);
        const inSubtasks = (task.subtasks ?? []).some((s) =>
          s.title.toLowerCase().includes(normalizedQuery)
        );
        if (!inTitle && !inDesc && !inBox && !inSubtasks) return false;
      }

      return true;
    });
  }, [
    tasks,
    activeListMap,
    hasFilters,
    showCompleted,
    maxMinutes,
    energy,
    priority,
    normalizedQuery,
  ]);

  const clearAll = () => {
    setQuery('');
    setMaxMinutes(null);
    setEnergy(null);
    setPriority(null);
  };

  if (!open) return null;

  return (
    <div
      className="search-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar e filtrar ações"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-panel">
        <div className="search-input-bar">
          <Search size={17} className="search-bar-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="search-bar-input"
            placeholder="Buscar em todas as caixas, notas e passos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="icon-btn-xs"
              aria-label="Limpar busca"
              onClick={() => setQuery('')}
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn-sm"
            aria-label="Fechar busca"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="search-filters">
          <div className="search-filter-group">
            <span className="search-filter-label">Tempo livre:</span>
            <div className="pill-selector-row">
              {MAX_TIME_FILTERS.map((opt) => (
                <button
                  key={opt.maxMinutes}
                  type="button"
                  className={`pill-option ${maxMinutes === opt.maxMinutes ? 'is-selected' : ''}`}
                  onClick={() =>
                    setMaxMinutes((prev) =>
                      prev === opt.maxMinutes ? null : opt.maxMinutes
                    )
                  }
                >
                  <Clock size={11} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="search-filter-group">
            <span className="search-filter-label">Energia:</span>
            <div className="pill-selector-row">
              {ENERGY_FILTERS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`pill-option ${energy === value ? 'is-selected' : ''}`}
                  onClick={() =>
                    setEnergy((prev) => (prev === value ? null : value))
                  }
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="search-filter-group">
            <span className="search-filter-label">Prioridade:</span>
            <div className="pill-selector-row">
              {PRIORITY_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`pill-option ${priority === opt.value ? 'is-selected' : ''}`}
                  onClick={() =>
                    setPriority((prev) => (prev === opt.value ? null : opt.value))
                  }
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="search-filter-footer">
            <label className="checkbox-inline" style={{ margin: 0, fontSize: '0.76rem' }}>
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              <span>Incluir concluídas</span>
            </label>

            {hasFilters && (
              <button
                type="button"
                className="btn-link-clear"
                onClick={clearAll}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="search-results">
          {!hasFilters ? (
            <p className="search-empty-hint">
              Digite algo para buscar ou escolha um filtro rápido de tempo,
              energia ou prioridade.
            </p>
          ) : matchingBoxes.length === 0 && matchingTasks.length === 0 ? (
            <p className="search-empty-hint">
              Nenhuma caixa ou ação encontrada com esses critérios.
            </p>
          ) : (
            <>
              {matchingBoxes.length > 0 && (
                <div className="search-section">
                  <span className="search-section-title">
                    Caixas ({matchingBoxes.length})
                  </span>
                  <div className="search-box-chips">
                    {matchingBoxes.map((box) => {
                      const BoxIcon = getBoxIcon(box.icon);
                      return (
                        <button
                          key={box.id}
                          type="button"
                          className="starter-chip"
                          data-color={box.color || 'blue'}
                          onClick={() => {
                            if (box.id != null) {
                              onOpenBox(box.id);
                              onClose();
                            }
                          }}
                        >
                          <BoxIcon size={13} />
                          <span>{box.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {matchingTasks.length > 0 && (
                <div className="search-section">
                  <span className="search-section-title">
                    Ações ({matchingTasks.length})
                  </span>
                  <div className="search-task-list">
                    {matchingTasks.map((task) => {
                      const box = activeListMap.get(task.listId);
                      const BoxIcon = getBoxIcon(box?.icon);
                      return (
                        <div
                          key={task.id}
                          className={`search-task-item ${task.completed ? 'task-completed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className="task-check"
                            checked={task.completed}
                            aria-label={`Concluir "${task.title}"`}
                            onChange={(e) =>
                              task.id != null &&
                              onToggleTask(task.id, e.target.checked)
                            }
                          />

                          <div
                            className="card-main"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (box?.id != null) {
                                onOpenBox(box.id);
                                onClose();
                              }
                            }}
                          >
                            <p className="task-title">{task.title}</p>
                            <div className="badges">
                              {box && (
                                <span
                                  className="badge search-box-origin"
                                  data-color={box.color || 'blue'}
                                >
                                  <BoxIcon size={10} />
                                  {box.name}
                                </span>
                              )}
                              <span className={`badge badge-${task.priority}`}>
                                {PRIORITY_LABEL[task.priority]}
                              </span>
                              {task.estimatedMinutes && (
                                <span className="badge badge-time">
                                  <Clock size={10} />
                                  {task.estimatedMinutes === 60
                                    ? '1h'
                                    : `${task.estimatedMinutes} min`}
                                </span>
                              )}
                              {task.energy && (
                                <span
                                  className={`badge badge-energy-${task.energy}`}
                                >
                                  {ENERGY_LABEL[task.energy]}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="icon-btn-sm"
                            aria-label="Editar ação"
                            onClick={() => {
                              onEditTask(task);
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
