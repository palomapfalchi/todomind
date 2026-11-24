export type Priority = 'baixa' | 'media' | 'alta';

export type BoxColorId =
  | 'slate'
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan';

export type BoxIconId =
  | 'inbox'
  | 'shopping-cart'
  | 'gift'
  | 'calendar'
  | 'home'
  | 'briefcase'
  | 'heart'
  | 'sparkles'
  | 'book'
  | 'pill'
  | 'lightbulb'
  | 'list';

export interface TaskList {
  id?: number;
  name: string;
  color: BoxColorId;
  icon: BoxIconId;
  pinned: boolean;
  order: number;
  isInbox?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id?: number;
  listId: number;
  title: string;
  priority: Priority;
  dueDate: string | null; // Formato YYYY-MM-DD (sem erro de fuso horário)
  completed: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ToDoMindBackupPayload {
  app: 'ToDoMind';
  schemaVersion: number;
  exportedAt: string;
  lists: TaskList[];
  tasks: Task[];
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};
