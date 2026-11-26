import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ArrowUpDown,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CornerDownLeft,
  GripVertical,
  HardDriveDownload,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { getBoxIcon } from './constants/boxes';
import { db } from './db/database';
import {
  createList,
  createTask,
  createTasksBatch,
  deleteListCascade,
  deleteTask,
  ensureInboxList,
  getLocalDateString,
  moveTaskToList,
  parseBatchLines,
  reorderList,
  reorderTask,
  reorderTaskToTarget,
  rescheduleOverdueTasks,
  resetListChecklist,
  setListSortMode,
  sortLists,
  sortTasks,
  toggleListPinned,
  toggleSubtaskCompleted,
  toggleTaskCompleted,
  updateList,
  updateTask,
} from './db/repositories';
import {
  ENERGY_LABEL,
  PRIORITY_LABEL,
  type BoxColorId,
  type BoxIconId,
  type EnergyLevel,
  type EstimatedMinutes,
  type ListSortMode,
  type Priority,
  type Subtask,
  type Task,
  type TaskList,
} from './db/types';
import { useTheme } from './hooks/useTheme';
import { triggerHaptic } from './utils/haptics';
import { BackupModal } from './components/BackupModal';
import { BoxCard } from './components/BoxCard';
import { BoxFormModal } from './components/BoxFormModal';
import { Modal } from './components/Modal';
import { OverdueBanner } from './components/OverdueBanner';
import { QuickDumpBar } from './components/QuickDumpBar';
import { TaskFormModal } from './components/TaskFormModal';
import { Toast } from './components/Toast';

type DragState = {
  kind: 'task';
  taskId: number;
  sourceListId: number;
  label: string;
  x: number;
  y: number;
  hoverListId: number | null;
  hoverTaskId: number | null;
} | null;

const STARTER_BOXES: Array<{
  name: string;
  color: BoxColorId;
  icon: BoxIconId;
  isReusable?: boolean;
}> = [
  { name: 'Mercado', color: 'emerald', icon: 'shopping-cart', isReusable: true },
  { name: 'Presentes', color: 'rose', icon: 'gift' },
  { name: 'Compromissos', color: 'amber', icon: 'calendar' },
  { name: 'Casa', color: 'cyan', icon: 'home', isReusable: true },
];

function formatDueDate(
  dateStr: string,
  dueTime?: string | null
): { label: string; overdue: boolean } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let base: string;
  if (diffDays === 0) base = 'Hoje';
  else if (diffDays === 1) base = 'Amanhã';
  else if (diffDays === -1) base = 'Ontem';
  else {
    base = target.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: target.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  return {
    label: dueTime ? `${base} · ${dueTime}` : base,
    overdue: diffDays < 0,
  };
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const quickDumpInputRef = useRef<HTMLTextAreaElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const popTimerRef = useRef<number | null>(null);

  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [detailQuickInput, setDetailQuickInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [justCompletedTaskId, setJustCompletedTaskId] = useState<number | null>(
    null
  );

  // Modos de reordenação por botões + Drag-and-drop (touch & mouse)
  const [reorderBoxesMode, setReorderBoxesMode] = useState(false);
  const [reorderTasksMode, setReorderTasksMode] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const dragStateRef = useRef<DragState>(null);
  dragStateRef.current = dragState;

  // Modais de Caixa
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [listToDelete, setListToDelete] = useState<TaskList | null>(null);

  // Modais de Ação e Backup
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (popTimerRef.current !== null) {
        window.clearTimeout(popTimerRef.current);
      }
    };
  }, []);

  // Garante a caixa permanente "Despejo" e trata atalhos PWA (?action=...)
  useEffect(() => {
    void ensureInboxList();

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action) {
      if (action === 'quick-dump') {
        setSelectedListId(null);
        window.setTimeout(() => quickDumpInputRef.current?.focus(), 120);
      } else if (action === 'new-box') {
        setSelectedListId(null);
        setEditingList(null);
        setBoxModalOpen(true);
      }
      params.delete('action');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  // Queries reativas do IndexedDB
  const rawLists = useLiveQuery(() => db.lists.toArray(), []);
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);

  const lists = useMemo(() => sortLists(rawLists ?? []), [rawLists]);
  const listsRef = useRef<TaskList[]>(lists);
  listsRef.current = lists;

  const inboxList = useMemo(
    () => lists.find((l) => l.isInbox) ?? null,
    [lists]
  );

  const activeList = useMemo(
    () => lists.find((l) => l.id === selectedListId) ?? null,
    [lists, selectedListId]
  );

  const listSortModeMap = useMemo(() => {
    const map = new Map<number, ListSortMode>();
    for (const list of lists) {
      if (list.id != null) {
        map.set(list.id, list.sortMode ?? 'auto');
      }
    }
    return map;
  }, [lists]);

  const tasksByList = useMemo(() => {
    const map = new Map<number, { pending: Task[]; completed: Task[] }>();
    const grouped = new Map<number, Task[]>();

    for (const task of allTasks ?? []) {
      const bucket = grouped.get(task.listId);
      if (bucket) {
        bucket.push(task);
      } else {
        grouped.set(task.listId, [task]);
      }
    }

    for (const [listId, items] of grouped.entries()) {
      const mode = listSortModeMap.get(listId) ?? 'auto';
      const sorted = sortTasks(items, mode);
      map.set(listId, {
        pending: sorted.filter((t) => !t.completed),
        completed: sorted.filter((t) => t.completed),
      });
    }

    return map;
  }, [allTasks, listSortModeMap]);

  const activeTasksState = useMemo(() => {
    if (selectedListId === null) {
      return { pending: [] as Task[], completed: [] as Task[] };
    }
    return (
      tasksByList.get(selectedListId) ?? {
        pending: [] as Task[],
        completed: [] as Task[],
      }
    );
  }, [tasksByList, selectedListId]);

  const todayStr = getLocalDateString(0);

  const totalOverdueCount = useMemo(
    () =>
      (allTasks ?? []).filter(
        (t) => !t.completed && Boolean(t.dueDate) && t.dueDate! < todayStr
      ).length,
    [allTasks, todayStr]
  );

  const activeOverdueCount = useMemo(
    () =>
      activeTasksState.pending.filter(
        (t) => Boolean(t.dueDate) && t.dueDate! < todayStr
      ).length,
    [activeTasksState.pending, todayStr]
  );

  const activeHasCheckedItems = useMemo(() => {
    if (activeTasksState.completed.length > 0) return true;
    return activeTasksState.pending.some((t) =>
      (t.subtasks ?? []).some((s) => s.completed)
    );
  }, [activeTasksState]);

  const reorderBoundsByListId = useMemo(() => {
    const map = new Map<number, { canPrev: boolean; canNext: boolean }>();
    const pinnedNonInbox = lists.filter((l) => !l.isInbox && l.pinned);
    const regularLists = lists.filter((l) => !l.isInbox && !l.pinned);

    for (const group of [pinnedNonInbox, regularLists]) {
      group.forEach((item, index) => {
        if (item.id != null) {
          map.set(item.id, {
            canPrev: index > 0,
            canNext: index < group.length - 1,
          });
        }
      });
    }
    return map;
  }, [lists]);

  const detailParsedLines = useMemo(
    () => parseBatchLines(detailQuickInput),
    [detailQuickInput]
  );

  const detailTextareaRows = useMemo(() => {
    if (detailQuickInput.length === 0) return 2;
    const rawCount = detailQuickInput.split(/\r?\n/).length;
    return Math.min(Math.max(rawCount, 2), 6);
  }, [detailQuickInput]);

  // Listeners globais para Drag-and-Drop via Pointer Events (Mobile Touch + Desktop Mouse)
  const isDragging = dragState !== null;

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const listDropEl = targetEl?.closest<HTMLElement>('[data-drop-list-id]');
      const taskDropEl = targetEl?.closest<HTMLElement>('[data-drop-task-id]');

      const rawListId = listDropEl?.dataset.dropListId;
      const rawTaskId = taskDropEl?.dataset.dropTaskId;
      const hoverListId = rawListId ? Number(rawListId) : null;
      const hoverTaskId = rawTaskId ? Number(rawTaskId) : null;

      setDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          x: e.clientX,
          y: e.clientY,
          hoverListId: Number.isFinite(hoverListId) ? hoverListId : null,
          hoverTaskId: Number.isFinite(hoverTaskId) ? hoverTaskId : null,
        };
      });
    };

    const finishDrag = async (cancelled: boolean) => {
      const current = dragStateRef.current;
      setDragState(null);
      if (cancelled || !current) return;

      // Arrastando uma ação:
      // 1) Soltar em outra caixa -> move a ação para essa caixa
      if (
        current.hoverListId != null &&
        current.hoverListId !== current.sourceListId
      ) {
        const moved = await moveTaskToList(current.taskId, current.hoverListId);
        if (moved) {
          triggerHaptic('check');
          const targetName =
            listsRef.current.find((l) => l.id === current.hoverListId)?.name ??
            'outra caixa';
          showToast(`Ação movida para ${targetName}`);
        }
        return;
      }

      // 2) Soltar sobre outra ação na mesma caixa -> reordena
      if (
        current.hoverTaskId != null &&
        current.hoverTaskId !== current.taskId
      ) {
        const reordered = await reorderTaskToTarget(
          current.sourceListId,
          current.taskId,
          current.hoverTaskId
        );
        if (reordered) {
          triggerHaptic('check');
        }
      }
    };

    const onUp = () => void finishDrag(false);
    const onCancel = () => void finishDrag(true);

    window.addEventListener('pointermove', handlePointerMove, {
      passive: false,
    });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [isDragging, showToast]);

  const handleStartTaskDrag = (
    task: Task,
    e: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (task.id == null) return;
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic('check');
    setDragState({
      kind: 'task',
      taskId: task.id,
      sourceListId: task.listId,
      label: task.title,
      x: e.clientX,
      y: e.clientY,
      hoverListId: null,
      hoverTaskId: null,
    });
  };

  // Handlers de Caixa
  const openCreateBox = () => {
    setEditingList(null);
    setBoxModalOpen(true);
  };

  const openEditBox = (list: TaskList) => {
    setEditingList(list);
    setBoxModalOpen(true);
  };

  const handleSaveBox = async (data: {
    name: string;
    color: BoxColorId;
    icon: BoxIconId;
    pinned: boolean;
    isReusable: boolean;
  }) => {
    if (editingList?.id != null) {
      await updateList(editingList.id, data);
      showToast(`Caixa "${data.name.trim()}" atualizada`);
    } else {
      await createList(data);
      showToast(`Caixa "${data.name.trim()}" criada`);
    }
  };

  const handleTogglePin = async (list: TaskList) => {
    if (list.id == null || list.isInbox) return;
    const nextPinned = !list.pinned;
    await toggleListPinned(list.id, nextPinned);
    showToast(
      nextPinned
        ? `"${list.name}" fixada no topo`
        : `"${list.name}" desafixada`
    );
  };

  const handleResetChecklist = async (list: TaskList) => {
    if (list.id == null) return;
    const count = await resetListChecklist(list.id);
    if (count > 0) {
      triggerHaptic('reset');
      showToast(
        `Checklist resetado — ${count} ${count === 1 ? 'ação pronta' : 'ações prontas'} de novo`
      );
    } else {
      showToast('Todas as ações já estão pendentes');
    }
  };

  const handleConfirmDeleteList = async () => {
    if (listToDelete?.id == null) return;
    const deletedName = listToDelete.name;
    if (selectedListId === listToDelete.id) {
      setSelectedListId(null);
      setReorderTasksMode(false);
    }
    await deleteListCascade(listToDelete.id);
    setListToDelete(null);
    showToast(`Caixa "${deletedName}" excluída`);
  };

  const handleCreateStarterBox = async (starter: {
    name: string;
    color: BoxColorId;
    icon: BoxIconId;
    isReusable?: boolean;
  }) => {
    await createList({
      name: starter.name,
      color: starter.color,
      icon: starter.icon,
      pinned: false,
      isReusable: starter.isReusable ?? false,
    });
    showToast(`Caixa "${starter.name}" criada`);
  };

  const handleMoveBox = async (listId: number, direction: 'up' | 'down') => {
    await reorderList(listId, direction);
  };

  // Handlers de Ação
  const openCreateTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleToggleTask = async (taskId: number, completed: boolean) => {
    if (completed) {
      triggerHaptic('check');
      setJustCompletedTaskId(taskId);
      if (popTimerRef.current !== null) {
        window.clearTimeout(popTimerRef.current);
      }
      popTimerRef.current = window.setTimeout(() => {
        setJustCompletedTaskId(null);
      }, 360);
    }
    await toggleTaskCompleted(taskId, completed);
  };

  const handleToggleSubtask = async (
    taskId: number,
    subtaskId: string,
    completed: boolean
  ) => {
    if (completed) {
      triggerHaptic('check');
    }
    await toggleSubtaskCompleted(taskId, subtaskId, completed);
  };

  const handleSaveTask = async (data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    dueTime: string | null;
    listId: number;
    subtasks: Subtask[];
    estimatedMinutes: EstimatedMinutes | null;
    energy: EnergyLevel | null;
  }) => {
    const targetName =
      lists.find((l) => l.id === data.listId)?.name ?? 'sua caixa';

    if (editingTask?.id != null) {
      const moved = editingTask.listId !== data.listId;
      await updateTask(editingTask.id, data);
      showToast(
        moved
          ? `Ação movida para ${targetName}`
          : `Ação atualizada em ${targetName}`
      );
    } else {
      await createTask(data);
      showToast(`Ação salva em ${targetName}`);
    }
  };

  const handleQuickAddInCard = async (listId: number, title: string) => {
    await createTask({ listId, title, priority: 'media', dueDate: null });
    const targetName = lists.find((l) => l.id === listId)?.name ?? 'lista';
    showToast(`Ação salva em ${targetName}`);
  };

  const handleDumpTasks = async (listId: number, rawText: string) => {
    const count = await createTasksBatch(listId, rawText, 'media', null);
    const targetName = lists.find((l) => l.id === listId)?.name ?? 'Despejo';
    if (count > 0) {
      showToast(
        count === 1
          ? `Ação salva em ${targetName}`
          : `${count} ações salvas em ${targetName}`
      );
    }
    return count;
  };

  const handleDetailQuickSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (activeList?.id == null || detailParsedLines.length === 0) return;
    const count = await createTasksBatch(
      activeList.id,
      detailQuickInput,
      'media',
      null
    );
    setDetailQuickInput('');
    if (count > 0) {
      showToast(
        count === 1
          ? `Ação salva em ${activeList.name}`
          : `${count} ações salvas em ${activeList.name}`
      );
    }
  };

  const handleDetailQuickKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleDetailQuickSubmit();
    }
  };

  const handleRescheduleOverdue = async (
    target: 'today' | 'tomorrow',
    listId?: number
  ) => {
    const count = await rescheduleOverdueTasks(target, listId);
    if (count > 0) {
      triggerHaptic('check');
      showToast(
        target === 'today'
          ? `${count} ${count === 1 ? 'ação trazida' : 'ações trazidas'} para hoje`
          : `${count} ${count === 1 ? 'ação adiada' : 'ações adiadas'} para amanhã`
      );
    }
  };

  const handleMoveTask = async (taskId: number, direction: 'up' | 'down') => {
    if (activeList?.id == null) return;
    await reorderTask(activeList.id, taskId, direction);
  };

  const handleSwitchToAutoSort = async () => {
    if (activeList?.id == null) return;
    await setListSortMode(activeList.id, 'auto');
    setReorderTasksMode(false);
    showToast('Ordenação automática ativada (data e prioridade)');
  };

  const renderEnergyIcon = (energy: EnergyLevel) => {
    if (energy === 'baixa') return <BatteryLow size={11} />;
    if (energy === 'media') return <BatteryMedium size={11} />;
    return <BatteryFull size={11} />;
  };

  const renderTaskCard = (
    task: Task,
    index: number,
    totalPending: number
  ) => {
    const due = task.dueDate ? formatDueDate(task.dueDate, task.dueTime) : null;
    const isOverdue = Boolean(due?.overdue && !task.completed);
    const hasDescription = Boolean(task.description && task.description.trim());
    const subtasks = task.subtasks ?? [];
    const doneSubtasks = subtasks.filter((s) => s.completed).length;
    const subProgress =
      subtasks.length > 0
        ? Math.round((doneSubtasks / subtasks.length) * 100)
        : 0;
    const showReorderControls = reorderTasksMode && !task.completed;
    const isTaskDragging =
      dragState?.kind === 'task' && dragState.taskId === task.id;
    const isTaskDropTarget =
      dragState?.kind === 'task' &&
      dragState.taskId !== task.id &&
      dragState.hoverTaskId === task.id &&
      !task.completed;

    return (
      <div
        key={task.id}
        data-drop-task-id={!task.completed ? task.id : undefined}
        className={`card task-row ${task.completed ? 'task-completed' : ''} ${justCompletedTaskId === task.id ? 'task-pop' : ''} ${isTaskDragging ? 'is-dragging' : ''} ${isTaskDropTarget ? 'is-task-drop-target' : ''}`}
      >
        {!task.completed && (
          <button
            type="button"
            className="drag-handle-task"
            aria-label={`Arrastar "${task.title}" para reordenar ou mover de caixa`}
            title="Arrastar para reordenar ou mover de caixa"
            onPointerDown={(e) => handleStartTaskDrag(task, e)}
          >
            <GripVertical size={15} />
          </button>
        )}

        <input
          type="checkbox"
          className="task-check"
          checked={task.completed}
          aria-label={`Marcar "${task.title}" como concluída`}
          onChange={(e) =>
            task.id != null && void handleToggleTask(task.id, e.target.checked)
          }
        />

        <div className="card-main">
          <p className="task-title">{task.title}</p>
          {hasDescription && (
            <p className="task-description">{task.description}</p>
          )}

          <div className="badges">
            <span className={`badge badge-${task.priority}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {due && (
              <span
                className={`badge ${isOverdue ? 'badge-overdue-gentle' : 'badge-date'}`}
              >
                <Calendar size={11} />
                {due.label}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="badge badge-time">
                <Clock size={11} />
                {task.estimatedMinutes === 60
                  ? '1h'
                  : `${task.estimatedMinutes} min`}
              </span>
            )}
            {task.energy && (
              <span className={`badge badge-energy-${task.energy}`}>
                {renderEnergyIcon(task.energy)}
                {ENERGY_LABEL[task.energy]}
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="subtask-card-block">
              <div className="subtask-progress-row">
                <span>
                  Micropassos: {doneSubtasks}/{subtasks.length}
                </span>
                <span>{subProgress}%</span>
              </div>
              <div className="subtask-progress-track">
                <div
                  className="subtask-progress-fill"
                  style={{ width: `${subProgress}%` }}
                />
              </div>
              <ul className="subtask-inline-list">
                {subtasks.map((st) => (
                  <li key={st.id} className="subtask-inline-item">
                    <label className="subtask-inline-label">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={(e) =>
                          task.id != null &&
                          void handleToggleSubtask(
                            task.id,
                            st.id,
                            e.target.checked
                          )
                        }
                      />
                      <span className={st.completed ? 'is-done' : ''}>
                        {st.title}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card-actions">
          {showReorderControls ? (
            <>
              <button
                type="button"
                className="icon-btn-sm reorder-arrow-btn"
                disabled={index === 0}
                aria-label={`Subir "${task.title}"`}
                title="Subir"
                onClick={() => task.id != null && void handleMoveTask(task.id, 'up')}
              >
                <ChevronUp size={17} />
              </button>
              <button
                type="button"
                className="icon-btn-sm reorder-arrow-btn"
                disabled={index >= totalPending - 1}
                aria-label={`Descer "${task.title}"`}
                title="Descer"
                onClick={() =>
                  task.id != null && void handleMoveTask(task.id, 'down')
                }
              >
                <ChevronDown size={17} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="icon-btn"
                aria-label="Editar ação"
                onClick={() => openEditTask(task)}
              >
                <Pencil size={17} />
              </button>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Excluir ação"
                onClick={() => {
                  if (task.id != null) {
                    void deleteTask(task.id);
                    showToast('Ação excluída');
                  }
                }}
              >
                <Trash2 size={17} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const ActiveIcon = activeList ? getBoxIcon(activeList.icon) : null;
  const totalPending = (allTasks ?? []).filter((t) => !t.completed).length;
  const showStarters = rawLists !== undefined && lists.length <= 1;
  const canReorderAnyBox = useMemo(() => {
    const pinnedCount = lists.filter((l) => !l.isInbox && l.pinned).length;
    const regularCount = lists.filter((l) => !l.isInbox && !l.pinned).length;
    return pinnedCount > 1 || regularCount > 1;
  }, [lists]);

  const otherListsForDrop = useMemo(() => {
    if (!activeList?.id) return [];
    return lists.filter((l) => l.id !== activeList.id);
  }, [lists, activeList]);

  return (
    <div className={`app-shell ${isDragging ? 'is-dragging-global' : ''}`}>
      <header className="header">
        <div className="header-left">
          {activeList ? (
            <>
              <button
                type="button"
                className="icon-btn"
                aria-label="Voltar para todas as caixas"
                onClick={() => {
                  setSelectedListId(null);
                  setDetailQuickInput('');
                  setReorderTasksMode(false);
                }}
              >
                <ArrowLeft size={20} />
              </button>
              {ActiveIcon && (
                <span
                  className="box-icon-pill header-box-pill"
                  data-color={activeList.color || 'blue'}
                  aria-hidden="true"
                >
                  <ActiveIcon size={15} />
                </span>
              )}
              <div className="header-title-wrap">
                <h1 className="header-title">{activeList.name}</h1>
                <span className="header-subtitle">
                  {activeTasksState.pending.length} pendente
                  {activeTasksState.pending.length === 1 ? '' : 's'}
                </span>
              </div>
            </>
          ) : (
            <div className="header-title-wrap">
              <h1 className="header-title">ToDoMind</h1>
              <span className="header-subtitle">
                {lists.length} caixa{lists.length === 1 ? '' : 's'} ·{' '}
                {totalPending}{' '}
                {totalPending === 1 ? 'ação pendente' : 'ações pendentes'}
              </span>
            </div>
          )}
        </div>

        <div className="header-right">
          {activeList ? (
            <>
              {activeList.isReusable && (
                <button
                  type="button"
                  className="icon-btn"
                  disabled={!activeHasCheckedItems}
                  aria-label="Resetar checklist desta caixa"
                  title="Resetar checklist"
                  onClick={() => void handleResetChecklist(activeList)}
                >
                  <RotateCcw size={18} />
                </button>
              )}
              {activeTasksState.pending.length > 1 && (
                <button
                  type="button"
                  className={`icon-btn ${reorderTasksMode ? 'is-active' : ''}`}
                  aria-label={
                    reorderTasksMode ? 'Concluir reordenação' : 'Reordenar ações'
                  }
                  title={
                    reorderTasksMode ? 'Concluir reordenação' : 'Reordenar ações'
                  }
                  onClick={() => setReorderTasksMode((prev) => !prev)}
                >
                  {reorderTasksMode ? <Check size={19} /> : <ArrowUpDown size={18} />}
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                aria-label="Editar caixa"
                title="Editar caixa"
                onClick={() => openEditBox(activeList)}
              >
                <Pencil size={18} />
              </button>
              {!activeList.isInbox && (
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Excluir caixa"
                  title="Excluir caixa"
                  onClick={() => setListToDelete(activeList)}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          ) : (
            <>
              {canReorderAnyBox && (
                <button
                  type="button"
                  className={`icon-btn ${reorderBoxesMode ? 'is-active' : ''}`}
                  aria-label={
                    reorderBoxesMode
                      ? 'Concluir reordenação de caixas'
                      : 'Reordenar caixas'
                  }
                  title={
                    reorderBoxesMode
                      ? 'Concluir reordenação'
                      : 'Reordenar caixas'
                  }
                  onClick={() => setReorderBoxesMode((prev) => !prev)}
                >
                  {reorderBoxesMode ? <Check size={19} /> : <ArrowUpDown size={18} />}
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                aria-label="Backup local em JSON"
                title="Backup JSON"
                onClick={() => setBackupModalOpen(true)}
              >
                <HardDriveDownload size={19} />
              </button>
            </>
          )}

          <button
            type="button"
            className="icon-btn"
            aria-label="Alternar tema claro e escuro"
            title="Alternar tema"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <main className="content">
        {!activeList ? (
          <>
            <QuickDumpBar
              lists={lists}
              inboxId={inboxList?.id ?? null}
              inputRef={quickDumpInputRef}
              onDump={handleDumpTasks}
            />

            <OverdueBanner
              count={totalOverdueCount}
              onBringToToday={() => void handleRescheduleOverdue('today')}
              onMoveToTomorrow={() => void handleRescheduleOverdue('tomorrow')}
            />

            {reorderBoxesMode && (
              <div className="reorder-banner">
                <span>
                  Use as setas <strong>‹ ›</strong> nas caixas para reorganizar a
                  ordem.
                </span>
                <button
                  type="button"
                  className="btn-inline-done"
                  onClick={() => setReorderBoxesMode(false)}
                >
                  Concluir
                </button>
              </div>
            )}

            {showStarters && (
              <section className="starter-strip" aria-label="Sugestões de caixas">
                <span className="starter-label">
                  Criar caixas rápidas para organizar sua rotina:
                </span>
                <div className="starter-chips">
                  {STARTER_BOXES.map((starter) => {
                    const StarterIcon = getBoxIcon(starter.icon);
                    return (
                      <button
                        key={starter.name}
                        type="button"
                        className="starter-chip"
                        data-color={starter.color}
                        onClick={() => void handleCreateStarterBox(starter)}
                      >
                        <StarterIcon size={13} />
                        <span>+ {starter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="boxes-grid" aria-label="Suas caixas">
              {lists.map((list) => {
                const state =
                  list.id != null
                    ? tasksByList.get(list.id) ?? { pending: [], completed: [] }
                    : { pending: [], completed: [] };
                const bounds =
                  list.id != null
                    ? reorderBoundsByListId.get(list.id) ?? {
                        canPrev: false,
                        canNext: false,
                      }
                    : { canPrev: false, canNext: false };

                const isTaskDropTarget =
                  dragState?.kind === 'task' &&
                  dragState.hoverListId === list.id &&
                  dragState.sourceListId !== list.id;

                const dropLabel = isTaskDropTarget
                  ? `Mover para ${list.name}`
                  : null;

                return (
                  <BoxCard
                    key={list.id}
                    list={list}
                    pendingTasks={state.pending}
                    completedCount={state.completed.length}
                    reorderMode={reorderBoxesMode}
                    canMovePrev={bounds.canPrev}
                    canMoveNext={bounds.canNext}
                    isDropTarget={isTaskDropTarget}
                    dropLabel={dropLabel}
                    draggingTaskId={
                      dragState?.kind === 'task' ? dragState.taskId : null
                    }
                    justCompletedTaskId={justCompletedTaskId}
                    onOpen={(id) => {
                      setReorderBoxesMode(false);
                      setSelectedListId(id);
                    }}
                    onEdit={openEditBox}
                    onTogglePin={handleTogglePin}
                    onMovePrev={(id) => void handleMoveBox(id, 'up')}
                    onMoveNext={(id) => void handleMoveBox(id, 'down')}
                    onStartTaskDrag={handleStartTaskDrag}
                    onToggleTask={(taskId, completed) =>
                      void handleToggleTask(taskId, completed)
                    }
                    onQuickAdd={handleQuickAddInCard}
                  />
                );
              })}
            </section>
          </>
        ) : (
          <div className="detail-stack">
            {/* Faixa de destino ao arrastar uma ação dentro da caixa */}
            {dragState?.kind === 'task' && otherListsForDrop.length > 0 && (
              <section
                className="detail-drop-dock"
                aria-label="Soltar em outra caixa para mover"
              >
                <span className="detail-drop-dock-label">
                  Solte em uma caixa para mover:
                </span>
                <div className="detail-drop-dock-chips">
                  {otherListsForDrop.map((other) => {
                    const OtherIcon = getBoxIcon(other.icon);
                    const isHovered = dragState.hoverListId === other.id;
                    return (
                      <div
                        key={other.id}
                        data-drop-list-id={other.id}
                        data-color={other.color || 'blue'}
                        className={`drop-dock-chip ${isHovered ? 'is-hovered' : ''}`}
                      >
                        <OtherIcon size={13} />
                        <span>{other.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <OverdueBanner
              count={activeOverdueCount}
              onBringToToday={() =>
                void handleRescheduleOverdue('today', activeList.id)
              }
              onMoveToTomorrow={() =>
                void handleRescheduleOverdue('tomorrow', activeList.id)
              }
            />

            <form
              className="detail-quick-add"
              data-color={activeList.color || 'blue'}
              onSubmit={handleDetailQuickSubmit}
            >
              <textarea
                className="detail-quick-textarea"
                rows={detailTextareaRows}
                placeholder={
                  'Adicionar rápido...\nPule linha (Enter) para criar várias ações de uma vez'
                }
                value={detailQuickInput}
                onChange={(e) => setDetailQuickInput(e.target.value)}
                onKeyDown={handleDetailQuickKeyDown}
              />
              <button
                type="submit"
                className="btn-dump-submit"
                disabled={detailParsedLines.length === 0}
              >
                <CornerDownLeft size={15} />
                <span>
                  {detailParsedLines.length > 1
                    ? `Adicionar (${detailParsedLines.length})`
                    : 'Adicionar'}
                </span>
              </button>
            </form>

            {activeList.isReusable && activeHasCheckedItems && (
              <div className="reusable-bar">
                <span>Rotina reutilizável</span>
                <button
                  type="button"
                  className="btn-reset-checklist"
                  onClick={() => void handleResetChecklist(activeList)}
                >
                  <RotateCcw size={13} />
                  <span>Resetar checklist</span>
                </button>
              </div>
            )}

            {(reorderTasksMode || activeList.sortMode === 'manual') &&
              activeTasksState.pending.length > 0 && (
                <div className="detail-sort-bar">
                  <span className="detail-sort-status">
                    {reorderTasksMode
                      ? 'Arraste ⋮⋮ ou use ↑ ↓ para reordenar'
                      : 'Ordem manual ativa'}
                  </span>
                  <div className="detail-sort-actions">
                    {activeList.sortMode === 'manual' && (
                      <button
                        type="button"
                        className="btn-sort-pill"
                        onClick={() => void handleSwitchToAutoSort()}
                      >
                        <Sparkles size={13} />
                        <span>Auto (data/prior.)</span>
                      </button>
                    )}
                    {reorderTasksMode && (
                      <button
                        type="button"
                        className="btn-inline-done"
                        onClick={() => setReorderTasksMode(false)}
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              )}

            {activeTasksState.pending.length > 0 ||
            activeTasksState.completed.length > 0 ? (
              <>
                {activeTasksState.pending.map((task, index) =>
                  renderTaskCard(task, index, activeTasksState.pending.length)
                )}
                {activeTasksState.completed.length > 0 && (
                  <>
                    <div className="section-divider">
                      Concluídas ({activeTasksState.completed.length})
                    </div>
                    {activeTasksState.completed.map((task, index) =>
                      renderTaskCard(task, index, activeTasksState.pending.length)
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Esta caixa está vazia.</p>
                <p>
                  Digite na barra acima (uma ou várias linhas) ou toque no botão
                  + para criar uma ação com micropassos, tempo, energia e data.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {dragState && (
        <div
          className="drag-ghost"
          style={{ left: dragState.x, top: dragState.y }}
          aria-hidden="true"
        >
          <GripVertical size={13} />
          <span>{dragState.label}</span>
        </div>
      )}

      <Toast message={toastMessage} />

      <button
        type="button"
        className="fab"
        aria-label={activeList ? 'Nova ação detalhada' : 'Nova caixa'}
        title={activeList ? 'Nova ação detalhada' : 'Nova caixa'}
        onClick={activeList ? openCreateTask : openCreateBox}
      >
        <Plus size={24} />
      </button>

      {/* Modal Criar / Editar Caixa */}
      <BoxFormModal
        open={boxModalOpen}
        initialList={editingList}
        onClose={() => setBoxModalOpen(false)}
        onSubmit={handleSaveBox}
        onRequestDelete={(list) => setListToDelete(list)}
      />

      {/* Modal Confirmar Exclusão em Cascata */}
      <Modal
        open={Boolean(listToDelete)}
        title="Excluir caixa?"
        onClose={() => setListToDelete(null)}
      >
        <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>
          A caixa <strong>{listToDelete?.name}</strong> e todas as ações dentro
          dela serão removidas permanentemente deste dispositivo.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setListToDelete(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirmDeleteList}
          >
            Excluir tudo
          </button>
        </div>
      </Modal>

      {/* Modal Criar / Editar Ação */}
      <TaskFormModal
        open={taskModalOpen}
        initialTask={editingTask}
        lists={lists}
        defaultListId={activeList?.id ?? inboxList?.id ?? null}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleSaveTask}
      />

      {/* Modal Backup Local JSON */}
      <BackupModal
        open={backupModalOpen}
        listsCount={lists.length}
        tasksCount={(allTasks ?? []).length}
        onClose={() => setBackupModalOpen(false)}
      />
    </div>
  );
}
