import { db } from './database';
import {
  PRIORITY_WEIGHT,
  type BoxColorId,
  type BoxIconId,
  type Priority,
  type Task,
  type TaskList,
  type ToDoMindBackupPayload,
} from './types';

const VALID_COLORS: ReadonlySet<string> = new Set([
  'slate',
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
]);

const VALID_ICONS: ReadonlySet<string> = new Set([
  'inbox',
  'shopping-cart',
  'gift',
  'calendar',
  'home',
  'briefcase',
  'heart',
  'sparkles',
  'book',
  'pill',
  'lightbulb',
  'list',
]);

const VALID_PRIORITIES: ReadonlySet<string> = new Set(['baixa', 'media', 'alta']);

// Guarda contra execução concorrente (ex.: React StrictMode)
let ensureInboxPromise: Promise<TaskList> | null = null;

// --- LISTAS / CAIXAS ---

export function ensureInboxList(): Promise<TaskList> {
  if (ensureInboxPromise) return ensureInboxPromise;

  ensureInboxPromise = (async () => {
    const existingLists = await db.lists.toArray();
    const existingInbox = existingLists.find((l) => l.isInbox);
    if (existingInbox) return existingInbox;

    const now = Date.now();
    const newInbox: Omit<TaskList, 'id'> = {
      name: 'Despejo',
      color: 'violet',
      icon: 'inbox',
      pinned: true,
      order: 0,
      isInbox: true,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.lists.add(newInbox);
    return { ...newInbox, id };
  })().finally(() => {
    ensureInboxPromise = null;
  });

  return ensureInboxPromise;
}

export async function createList(data: {
  name: string;
  color?: BoxColorId;
  icon?: BoxIconId;
  pinned?: boolean;
}): Promise<number> {
  const now = Date.now();
  const count = await db.lists.count();
  return db.lists.add({
    name: data.name.trim(),
    color: data.color ?? 'blue',
    icon: data.icon ?? 'list',
    pinned: data.pinned ?? false,
    order: count + 1,
    isInbox: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateList(
  id: number,
  data: {
    name: string;
    color: BoxColorId;
    icon: BoxIconId;
    pinned?: boolean;
  }
): Promise<void> {
  const patch: Partial<TaskList> = {
    name: data.name.trim(),
    color: data.color,
    icon: data.icon,
    updatedAt: Date.now(),
  };
  if (typeof data.pinned === 'boolean') {
    patch.pinned = data.pinned;
  }
  await db.lists.update(id, patch);
}

export async function toggleListPinned(
  id: number,
  pinned: boolean
): Promise<void> {
  await db.lists.update(id, {
    pinned,
    updatedAt: Date.now(),
  });
}

export async function deleteListCascade(listId: number): Promise<void> {
  const list = await db.lists.get(listId);
  if (list?.isInbox) {
    throw new Error('A caixa Despejo não pode ser excluída.');
  }

  await db.transaction('rw', db.lists, db.tasks, async () => {
    await db.tasks.where('listId').equals(listId).delete();
    await db.lists.delete(listId);
  });
}

// Ordenação das caixas: Despejo primeiro, depois fixadas, depois mais recentes
export function sortLists(lists: TaskList[]): TaskList[] {
  return [...lists].sort((a, b) => {
    const aInbox = Boolean(a.isInbox);
    const bInbox = Boolean(b.isInbox);
    if (aInbox !== bInbox) return aInbox ? -1 : 1;

    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (a.order !== b.order) return a.order - b.order;
    return b.createdAt - a.createdAt;
  });
}

// --- TAREFAS / AÇÕES ---

export function parseBatchLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^([-*•]|\[\s?[xX]?\s?\])\s+/, '').trim())
    .filter((line) => line.length > 0);
}

export async function createTask(data: {
  listId: number;
  title: string;
  priority?: Priority;
  dueDate?: string | null;
}): Promise<number> {
  const now = Date.now();
  const existingCount = await db.tasks.where('listId').equals(data.listId).count();
  return db.tasks.add({
    listId: data.listId,
    title: data.title.trim(),
    priority: data.priority ?? 'media',
    dueDate: data.dueDate || null,
    completed: false,
    order: existingCount + 1,
    createdAt: now,
    updatedAt: now,
  });
}

export async function createTasksBatch(
  listId: number,
  rawText: string,
  priority: Priority = 'media',
  dueDate: string | null = null
): Promise<number> {
  const lines = parseBatchLines(rawText);
  if (lines.length === 0) return 0;

  const now = Date.now();
  const baseCount = await db.tasks.where('listId').equals(listId).count();
  const records: Omit<Task, 'id'>[] = lines.map((title, idx) => ({
    listId,
    title,
    priority,
    dueDate: dueDate || null,
    completed: false,
    order: baseCount + idx + 1,
    createdAt: now + idx,
    updatedAt: now + idx,
  }));

  await db.tasks.bulkAdd(records);
  return records.length;
}

export async function updateTask(
  id: number,
  data: {
    title: string;
    priority: Priority;
    dueDate: string | null;
    listId?: number;
  }
): Promise<void> {
  const patch: Partial<Task> = {
    title: data.title.trim(),
    priority: data.priority,
    dueDate: data.dueDate || null,
    updatedAt: Date.now(),
  };
  if (typeof data.listId === 'number') {
    patch.listId = data.listId;
  }
  await db.tasks.update(id, patch);
}

export async function toggleTaskCompleted(
  id: number,
  completed: boolean
): Promise<void> {
  await db.tasks.update(id, {
    completed,
    updatedAt: Date.now(),
  });
}

export async function deleteTask(id: number): Promise<void> {
  await db.tasks.delete(id);
}

// Ordenação: pendentes no topo (vencimento -> prioridade -> criação), concluídas abaixo
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (!a.completed) {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (weightDiff !== 0) return weightDiff;

      return a.createdAt - b.createdAt;
    }

    return b.updatedAt - a.updatedAt;
  });
}

// --- BACKUP JSON ---

export async function exportBackupData(): Promise<ToDoMindBackupPayload> {
  const [lists, tasks] = await Promise.all([
    db.lists.toArray(),
    db.tasks.toArray(),
  ]);

  return {
    app: 'ToDoMind',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    lists,
    tasks,
  };
}

export async function importBackupData(
  rawJson: string,
  mode: 'merge' | 'replace'
): Promise<{ listsImported: number; tasksImported: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Arquivo JSON inválido.');
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as ToDoMindBackupPayload).lists) ||
    !Array.isArray((parsed as ToDoMindBackupPayload).tasks)
  ) {
    throw new Error('Formato de backup não reconhecido pelo ToDoMind.');
  }

  const payload = parsed as ToDoMindBackupPayload;
  const now = Date.now();

  let listsImported = 0;
  let tasksImported = 0;

  await db.transaction('rw', db.lists, db.tasks, async () => {
    if (mode === 'replace') {
      await db.tasks.clear();
      await db.lists.clear();
    }

    const existingLists = await db.lists.toArray();
    const existingInbox = existingLists.find((l) => l.isInbox);
    const idMap = new Map<number, number>();
    let nextOrder = existingLists.length + 1;

    for (const rawList of payload.lists) {
      if (!rawList || typeof rawList.name !== 'string' || !rawList.name.trim()) {
        continue;
      }

      const oldId = rawList.id;
      const isInbox = Boolean(rawList.isInbox);

      // Em modo mesclar, reutiliza a caixa Despejo existente para não duplicá-la
      if (mode === 'merge' && isInbox && existingInbox?.id !== undefined) {
        if (typeof oldId === 'number') {
          idMap.set(oldId, existingInbox.id);
        }
        continue;
      }

      const color: BoxColorId = VALID_COLORS.has(rawList.color)
        ? rawList.color
        : 'blue';
      const icon: BoxIconId = VALID_ICONS.has(rawList.icon)
        ? rawList.icon
        : isInbox
          ? 'inbox'
          : 'list';

      const newId = await db.lists.add({
        name: rawList.name.trim(),
        color,
        icon,
        pinned: isInbox ? true : Boolean(rawList.pinned),
        order: typeof rawList.order === 'number' ? rawList.order : nextOrder++,
        isInbox,
        createdAt: typeof rawList.createdAt === 'number' ? rawList.createdAt : now,
        updatedAt: typeof rawList.updatedAt === 'number' ? rawList.updatedAt : now,
      });

      if (typeof oldId === 'number') {
        idMap.set(oldId, newId);
      }
      listsImported += 1;
    }

    let fallbackInboxId = existingInbox?.id;
    if (fallbackInboxId === undefined) {
      const currentLists = await db.lists.toArray();
      const foundInbox = currentLists.find((l) => l.isInbox);
      if (foundInbox?.id !== undefined) {
        fallbackInboxId = foundInbox.id;
      } else {
        fallbackInboxId = await db.lists.add({
          name: 'Despejo',
          color: 'violet',
          icon: 'inbox',
          pinned: true,
          order: 0,
          isInbox: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    let taskOrder = (await db.tasks.count()) + 1;
    for (const rawTask of payload.tasks) {
      if (!rawTask || typeof rawTask.title !== 'string' || !rawTask.title.trim()) {
        continue;
      }

      const mappedListId =
        typeof rawTask.listId === 'number'
          ? idMap.get(rawTask.listId) ?? fallbackInboxId
          : fallbackInboxId;

      const priority: Priority = VALID_PRIORITIES.has(rawTask.priority)
        ? rawTask.priority
        : 'media';

      const dueDate =
        typeof rawTask.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTask.dueDate)
          ? rawTask.dueDate
          : null;

      await db.tasks.add({
        listId: mappedListId,
        title: rawTask.title.trim(),
        priority,
        dueDate,
        completed: Boolean(rawTask.completed),
        order: typeof rawTask.order === 'number' ? rawTask.order : taskOrder++,
        createdAt: typeof rawTask.createdAt === 'number' ? rawTask.createdAt : now,
        updatedAt: typeof rawTask.updatedAt === 'number' ? rawTask.updatedAt : now,
      });
      tasksImported += 1;
    }
  });

  return { listsImported, tasksImported };
}
