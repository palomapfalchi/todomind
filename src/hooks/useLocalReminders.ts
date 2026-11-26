import { useCallback, useEffect, useState } from 'react';
import { getLocalDateString } from '../db/repositories';
import type { Task } from '../db/types';
import { triggerHaptic } from '../utils/haptics';

const ENABLED_KEY = 'todomind-reminders-enabled';
const NOTIFIED_KEY = 'todomind-reminders-notified';

function loadNotifiedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveNotifiedMap(map: Record<string, number>): void {
  try {
    // Limpa entradas com mais de 3 dias
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const pruned: Record<string, number> = {};
    for (const [k, ts] of Object.entries(map)) {
      if (ts >= cutoff) pruned[k] = ts;
    }
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(pruned));
  } catch {
    // ignora quota
  }
}

async function dispatchSystemNotification(title: string, body: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: './pwa-192x192.png',
          badge: './pwa-64x64.png',
          tag: `todomind-${title}`,
        });
        return;
      }
    }
  } catch {
    // fallback abaixo
  }

  try {
    new Notification(title, {
      body,
      icon: './pwa-192x192.png',
    });
  } catch {
    // alguns contextos bloqueiam new Notification direto
  }
}

export function useLocalReminders(
  tasks: Task[] | undefined,
  listNamesById: Map<number, string>,
  onInAppReminder: (message: string) => void
) {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    supported ? Notification.permission : 'denied'
  );
  const [enabled, setEnabled] = useState<boolean>(
    () => localStorage.getItem(ENABLED_KEY) === 'true'
  );

  const toggleReminders = useCallback(async (): Promise<{
    enabled: boolean;
    message: string;
  }> => {
    if (!supported) {
      return {
        enabled: false,
        message: 'Este navegador não suporta notificações locais.',
      };
    }

    if (enabled) {
      localStorage.setItem(ENABLED_KEY, 'false');
      setEnabled(false);
      return { enabled: false, message: 'Lembretes locais desativados' };
    }

    let currentPerm = Notification.permission;
    if (currentPerm === 'default') {
      currentPerm = await Notification.requestPermission();
    }
    setPermission(currentPerm);

    if (currentPerm !== 'granted') {
      localStorage.setItem(ENABLED_KEY, 'false');
      setEnabled(false);
      return {
        enabled: false,
        message:
          'Permissão negada no navegador. Libere notificações nas configurações do site.',
      };
    }

    localStorage.setItem(ENABLED_KEY, 'true');
    setEnabled(true);
    return {
      enabled: true,
      message: 'Lembretes ativados para ações com data e horário',
    };
  }, [enabled, supported]);

  useEffect(() => {
    if (!enabled || !tasks || tasks.length === 0) return;

    const checkDueTasks = () => {
      const now = new Date();
      const today = getLocalDateString(0);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const notified = loadNotifiedMap();
      let changed = false;

      for (const task of tasks) {
        if (
          task.id == null ||
          task.completed ||
          !task.dueDate ||
          !task.dueTime ||
          task.dueDate !== today
        ) {
          continue;
        }

        const [hStr, mStr] = task.dueTime.split(':');
        const h = Number(hStr);
        const m = Number(mStr);
        if (!Number.isFinite(h) || !Number.isFinite(m)) continue;

        const targetMinutes = h * 60 + m;
        // Dispara se o horário chegou nos últimos 15 minutos
        const diff = nowMinutes - targetMinutes;
        if (diff < 0 || diff > 15) continue;

        const key = `${task.id}:${task.dueDate}:${task.dueTime}`;
        if (notified[key]) continue;

        notified[key] = Date.now();
        changed = true;

        const boxName = listNamesById.get(task.listId) ?? 'ToDoMind';
        const body = `${boxName} · ${task.dueTime}`;
        triggerHaptic('timer');
        onInAppReminder(`Lembrete (${task.dueTime}): ${task.title}`);
        void dispatchSystemNotification(task.title, body);
      }

      if (changed) {
        saveNotifiedMap(notified);
      }
    };

    checkDueTasks();
    const interval = window.setInterval(checkDueTasks, 30_000);
    return () => window.clearInterval(interval);
  }, [enabled, tasks, listNamesById, onInAppReminder]);

  return {
    supported,
    permission,
    enabled: enabled && permission === 'granted',
    toggleReminders,
  };
}
