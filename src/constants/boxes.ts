import {
  BookOpen,
  Briefcase,
  Calendar,
  Gift,
  Heart,
  Home,
  Inbox,
  Lightbulb,
  ListTodo,
  Pill,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { BoxColorId, BoxIconId } from '../db/types';

export interface BoxColorOption {
  id: BoxColorId;
  label: string;
  swatch: string;
}

export const BOX_COLORS: BoxColorOption[] = [
  { id: 'violet', label: 'Lavanda', swatch: '#7c3aed' },
  { id: 'blue', label: 'Azul', swatch: '#2563eb' },
  { id: 'emerald', label: 'Verde', swatch: '#059669' },
  { id: 'amber', label: 'Âmbar', swatch: '#d97706' },
  { id: 'rose', label: 'Rosa', swatch: '#e11d48' },
  { id: 'cyan', label: 'Ciano', swatch: '#0891b2' },
  { id: 'slate', label: 'Neutro', swatch: '#64748b' },
];

export interface BoxIconOption {
  id: BoxIconId;
  label: string;
  Icon: LucideIcon;
}

export const BOX_ICONS: BoxIconOption[] = [
  { id: 'inbox', label: 'Despejo', Icon: Inbox },
  { id: 'shopping-cart', label: 'Mercado', Icon: ShoppingCart },
  { id: 'gift', label: 'Presentes', Icon: Gift },
  { id: 'calendar', label: 'Compromissos', Icon: Calendar },
  { id: 'home', label: 'Casa', Icon: Home },
  { id: 'briefcase', label: 'Trabalho', Icon: Briefcase },
  { id: 'pill', label: 'Saúde', Icon: Pill },
  { id: 'lightbulb', label: 'Ideias', Icon: Lightbulb },
  { id: 'book', label: 'Estudos', Icon: BookOpen },
  { id: 'heart', label: 'Pessoal', Icon: Heart },
  { id: 'sparkles', label: 'Projetos', Icon: Sparkles },
  { id: 'list', label: 'Geral', Icon: ListTodo },
];

export const BOX_ICON_MAP: Record<BoxIconId, LucideIcon> = BOX_ICONS.reduce(
  (acc, item) => {
    acc[item.id] = item.Icon;
    return acc;
  },
  {} as Record<BoxIconId, LucideIcon>
);

export function getBoxIcon(icon: BoxIconId | undefined): LucideIcon {
  return (icon && BOX_ICON_MAP[icon]) || ListTodo;
}
