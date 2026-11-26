export type Priority = 'baixa' | 'media' | 'alta';

export type ListSortMode = 'auto' | 'manual';

export type EnergyLevel = 'baixa' | 'media' | 'alta';

export type EstimatedMinutes = 2 | 5 | 15 | 30 | 60;

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

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
  sortMode?: ListSortMode;
  isReusable?: boolean;
  archivedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id?: number;
  listId: number;
  title: string;
  description?: string;
  priority: Priority;
  dueDate: string | null; // Formato YYYY-MM-DD (sem erro de fuso horário)
  dueTime?: string | null; // Formato HH:MM opcional
  completed: boolean;
  order: number;
  subtasks?: Subtask[];
  estimatedMinutes?: EstimatedMinutes | null;
  energy?: EnergyLevel | null;
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

export const ENERGY_LABEL: Record<EnergyLevel, string> = {
  baixa: 'Energia baixa',
  media: 'Energia média',
  alta: 'Energia alta',
};

export const ESTIMATED_MINUTES_OPTIONS: Array<{
  value: EstimatedMinutes;
  label: string;
}> = [
  { value: 2, label: '2 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1h' },
];
