import Dexie, { type Table } from 'dexie';
import type { Task, TaskList } from './types';

export class ToDoMindDatabase extends Dexie {
  lists!: Table<TaskList, number>;
  tasks!: Table<Task, number>;

  constructor() {
    super('todomind_db');

    // Migration v1: Estrutura inicial do ToDoMind
    this.version(1).stores({
      lists: '++id, name, createdAt, updatedAt',
      tasks: '++id, listId, completed, priority, dueDate, createdAt',
    });

    // Migration v2 (v1.5): Visual em caixas (cor, ícone, fixar, ordem, caixa Despejo)
    this.version(2)
      .stores({
        lists: '++id, name, pinned, order, isInbox, createdAt, updatedAt',
        tasks: '++id, listId, completed, priority, dueDate, order, createdAt',
      })
      .upgrade(async (tx) => {
        let listIndex = 1;
        await tx
          .table('lists')
          .toCollection()
          .modify((list: Partial<TaskList>) => {
            list.color = list.color ?? 'blue';
            list.icon = list.icon ?? 'list';
            list.pinned = list.pinned ?? false;
            list.isInbox = list.isInbox ?? false;
            list.order = list.order ?? listIndex++;
          });

        let taskIndex = 1;
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: Partial<Task>) => {
            task.order = task.order ?? taskIndex++;
          });
      });

    // Migration v3 (v1.6): Descrição da nota nas ações e modo de ordenação manual/automático
    this.version(3)
      .stores({
        lists: '++id, name, pinned, order, isInbox, createdAt, updatedAt',
        tasks: '++id, listId, completed, priority, dueDate, order, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('lists')
          .toCollection()
          .modify((list: Partial<TaskList>) => {
            list.sortMode = list.sortMode ?? 'auto';
          });

        await tx
          .table('tasks')
          .toCollection()
          .modify((task: Partial<Task>) => {
            task.description = task.description ?? '';
          });
      });
  }
}

export const db = new ToDoMindDatabase();
