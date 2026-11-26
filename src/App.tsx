import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  HardDriveDownload,
  Moon,
  Pencil,
  Plus,
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
  parseBatchLines,
  reorderList,
  reorderTask,
  setListSortMode,
  sortLists,
  sortTasks,
  toggleListPinned,
  toggleTaskCompleted,
  updateList,
  updateTask,
} from './db/repositories';
import {
  PRIORITY_LABEL,
  type BoxColorId,
  type BoxIconId,
  type ListSortMode,
  type Priority,
  type Task,
  type TaskList,
} from './db/types';
import { useTheme } from './hooks/useTheme';
import { BackupModal } from './components/BackupModal';
import { BoxCard } from './components/BoxCard';
import { BoxFormModal } from './components/BoxFormModal';
import { Modal } from './components/Modal';
import { QuickDumpBar } from './components/QuickDumpBar';
import { TaskFormModal } from './components/TaskFormModal';
import { Toast } from './components/Toast';

const STARTER_BOXES: Array<{
  name: string;
  color: BoxColorId;
  icon: BoxIconId;
}> = [
  { name: 'Mercado', color: 'emerald', icon: 'shopping-cart' },
  { name: 'Presentes', color: 'rose', icon: 'gift' },
  { name: 'Compromissos', color: 'amber', icon: 'calendar' },
  { name: 'Casa', color: 'cyan', icon: 'home' },
];

function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return { label: 'Hoje', overdue: false };
  if (diffDays === 1) return { label: 'Amanhã', overdue: false };
  if (diffDays === -1) return { label: 'Ontem', overdue: true };

  const formatted = target.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: target.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });

  return { label: formatted, overdue: diffDays < 0 };
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const quickDumpInputRef = useRef<HTMLTextAreaElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [detailQuickInput, setDetailQuickInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modos de reordenação
  const [reorderBoxesMode, setReorderBoxesMode] = useState(false);
  const [reorderTasksMode, setReorderTasksMode] = useState(false);

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

  // Grupos para saber quais caixas podem ser movidas para antes/depois
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
  }) => {
    await createList({
      name: starter.name,
      color: starter.color,
      icon: starter.icon,
      pinned: false,
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

  const handleSaveTask = async (data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    listId: number;
  }) => {
    const targetName =
      lists.find((l) => l.id === data.listId)?.name ?? 'sua caixa';

    if (editingTask?.id != null) {
      const moved = editingTask.listId !== data.listId;
      await updateTask(editingTask.id, data);
      showToast(
        moved ? `Ação movida para ${targetName}` : `Ação atualizada em ${targetName}`
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
    // Enter quebra linha naturalmente para criar várias ações de uma vez.
    // Ctrl+Enter / Cmd+Enter salva rapidamente no PC.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleDetailQuickSubmit();
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

  const renderTaskCard = (
    task: Task,
    index: number,
    totalPending: number
  ) => {
    const due = task.dueDate ? formatDueDate(task.dueDate) : null;
    const isOverdue = Boolean(due?.overdue && !task.completed);
    const hasDescription = Boolean(task.description && task.description.trim());
    const showReorderControls = reorderTasksMode && !task.completed;

    return (
      <div
        key={task.id}
        className={`card task-row ${task.completed ? 'task-completed' : ''}`}
      >
        <input
          type="checkbox"
          className="task-check"
          checked={task.completed}
          aria-label={`Marcar "${task.title}" como concluída`}
          onChange={(e) =>
            task.id != null && void toggleTaskCompleted(task.id, e.target.checked)
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
                className={`badge ${isOverdue ? 'badge-overdue' : 'badge-date'}`}
              >
                <Calendar size={11} />
                {due.label}
              </span>
            )}
          </div>
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
                onClick={() => task.id != null && void handleMoveTask(task.id, 'down')}
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

  return (
    <div className="app-shell">
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
                {totalPending} ação{totalPending === 1 ? '' : 'ões'} pendente
                {totalPending === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        <div className="header-right">
          {activeList ? (
            <>
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

                return (
                  <BoxCard
                    key={list.id}
                    list={list}
                    pendingTasks={state.pending}
                    completedCount={state.completed.length}
                    reorderMode={reorderBoxesMode}
                    canMovePrev={bounds.canPrev}
                    canMoveNext={bounds.canNext}
                    onOpen={(id) => {
                      setReorderBoxesMode(false);
                      setSelectedListId(id);
                    }}
                    onEdit={openEditBox}
                    onTogglePin={handleTogglePin}
                    onMovePrev={(id) => void handleMoveBox(id, 'up')}
                    onMoveNext={(id) => void handleMoveBox(id, 'down')}
                    onToggleTask={(taskId, completed) =>
                      void toggleTaskCompleted(taskId, completed)
                    }
                    onQuickAdd={handleQuickAddInCard}
                  />
                );
              })}
            </section>
          </>
        ) : (
          <div className="detail-stack">
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

            {(reorderTasksMode || activeList.sortMode === 'manual') &&
              activeTasksState.pending.length > 0 && (
                <div className="detail-sort-bar">
                  <span className="detail-sort-status">
                    {reorderTasksMode
                      ? 'Use ↑ ↓ para reordenar as ações'
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
                  + para criar uma ação com descrição, prioridade e data.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

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
