import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Calendar,
  CornerDownLeft,
  HardDriveDownload,
  Moon,
  Pencil,
  Plus,
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

  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [detailQuickInput, setDetailQuickInput] = useState('');

  // Modais de Caixa
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [listToDelete, setListToDelete] = useState<TaskList | null>(null);

  // Modais de Ação e Backup
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

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
      const sorted = sortTasks(items);
      map.set(listId, {
        pending: sorted.filter((t) => !t.completed),
        completed: sorted.filter((t) => t.completed),
      });
    }

    return map;
  }, [allTasks]);

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

  const detailParsedLines = useMemo(
    () => parseBatchLines(detailQuickInput),
    [detailQuickInput]
  );

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
    if (editingList?.id) {
      await updateList(editingList.id, data);
    } else {
      await createList(data);
    }
  };

  const handleTogglePin = async (list: TaskList) => {
    if (!list.id || list.isInbox) return;
    await toggleListPinned(list.id, !list.pinned);
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDelete?.id) return;
    if (selectedListId === listToDelete.id) {
      setSelectedListId(null);
    }
    await deleteListCascade(listToDelete.id);
    setListToDelete(null);
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
    priority: Priority;
    dueDate: string | null;
    listId: number;
  }) => {
    if (editingTask?.id) {
      await updateTask(editingTask.id, data);
    } else {
      await createTask(data);
    }
  };

  const handleQuickAddInCard = async (listId: number, title: string) => {
    await createTask({ listId, title, priority: 'media', dueDate: null });
  };

  const handleDumpTasks = async (listId: number, rawText: string) => {
    return createTasksBatch(listId, rawText, 'media', null);
  };

  const handleDetailQuickSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!activeList?.id || detailParsedLines.length === 0) return;
    await createTasksBatch(activeList.id, detailQuickInput, 'media', null);
    setDetailQuickInput('');
  };

  const handleDetailQuickKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !detailQuickInput.includes('\n')) {
      e.preventDefault();
      void handleDetailQuickSubmit();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleDetailQuickSubmit();
    }
  };

  const renderTaskCard = (task: Task) => {
    const due = task.dueDate ? formatDueDate(task.dueDate) : null;
    const isOverdue = Boolean(due?.overdue && !task.completed);

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
            task.id && toggleTaskCompleted(task.id, e.target.checked)
          }
        />

        <div className="card-main">
          <p className="task-title">{task.title}</p>
          <div className="badges">
            <span className={`badge badge-${task.priority}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {due && (
              <span
                className={`badge ${isOverdue ? 'badge-overdue' : 'badge-date'}`}
              >
                <Calendar size={12} />
                {due.label}
              </span>
            )}
          </div>
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Editar ação"
            onClick={() => openEditTask(task)}
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Excluir ação"
            onClick={() => task.id && deleteTask(task.id)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  };

  const ActiveIcon = activeList ? getBoxIcon(activeList.icon) : null;
  const totalPending = (allTasks ?? []).filter((t) => !t.completed).length;
  const showStarters = rawLists !== undefined && lists.length <= 1;

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
                }}
              >
                <ArrowLeft size={22} />
              </button>
              {ActiveIcon && (
                <span
                  className="box-icon-pill header-box-pill"
                  data-color={activeList.color || 'blue'}
                  aria-hidden="true"
                >
                  <ActiveIcon size={17} />
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
          {activeList && (
            <>
              <button
                type="button"
                className="icon-btn"
                aria-label="Editar caixa"
                title="Editar caixa"
                onClick={() => openEditBox(activeList)}
              >
                <Pencil size={19} />
              </button>
              {!activeList.isInbox && (
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Excluir caixa"
                  title="Excluir caixa"
                  onClick={() => setListToDelete(activeList)}
                >
                  <Trash2 size={19} />
                </button>
              )}
            </>
          )}

          {!activeList && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Backup local em JSON"
              title="Backup JSON"
              onClick={() => setBackupModalOpen(true)}
            >
              <HardDriveDownload size={20} />
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            aria-label="Alternar tema claro e escuro"
            title="Alternar tema"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
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
                        <StarterIcon size={14} />
                        <span>+ {starter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="boxes-grid" aria-label="Suas caixas">
              {lists.map((list) => {
                const state = list.id
                  ? tasksByList.get(list.id) ?? { pending: [], completed: [] }
                  : { pending: [], completed: [] };

                return (
                  <BoxCard
                    key={list.id}
                    list={list}
                    pendingTasks={state.pending}
                    completedCount={state.completed.length}
                    onOpen={(id) => setSelectedListId(id)}
                    onEdit={openEditBox}
                    onTogglePin={handleTogglePin}
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
                rows={detailQuickInput.includes('\n') ? 3 : 1}
                placeholder="Adicionar rápido (cole várias linhas para criar em lote)..."
                value={detailQuickInput}
                onChange={(e) => setDetailQuickInput(e.target.value)}
                onKeyDown={handleDetailQuickKeyDown}
              />
              <button
                type="submit"
                className="btn-dump-submit"
                disabled={detailParsedLines.length === 0}
              >
                <CornerDownLeft size={16} />
                <span>
                  {detailParsedLines.length > 1
                    ? `Adicionar (${detailParsedLines.length})`
                    : 'Adicionar'}
                </span>
              </button>
            </form>

            {activeTasksState.pending.length > 0 ||
            activeTasksState.completed.length > 0 ? (
              <>
                {activeTasksState.pending.map(renderTaskCard)}
                {activeTasksState.completed.length > 0 && (
                  <>
                    <div className="section-divider">
                      Concluídas ({activeTasksState.completed.length})
                    </div>
                    {activeTasksState.completed.map(renderTaskCard)}
                  </>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Esta caixa está vazia.</p>
                <p>
                  Digite na barra acima ou toque no botão + para criar uma ação
                  com prioridade e data.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <button
        type="button"
        className="fab"
        aria-label={activeList ? 'Nova ação detalhada' : 'Nova caixa'}
        title={activeList ? 'Nova ação detalhada' : 'Nova caixa'}
        onClick={activeList ? openCreateTask : openCreateBox}
      >
        <Plus size={26} />
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
        <p style={{ margin: '0 0 8px' }}>
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
