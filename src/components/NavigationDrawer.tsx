import { useEffect } from 'react';
import {
  Archive,
  ArrowUpDown,
  Bell,
  BellOff,
  HardDriveDownload,
  LayoutGrid,
  Moon,
  Sun,
  X,
} from 'lucide-react';

interface NavigationDrawerProps {
  open: boolean;
  currentView: 'home' | 'archived';
  archivedCount: number;
  canReorderBoxes: boolean;
  reorderBoxesMode: boolean;
  remindersEnabled: boolean;
  remindersSupported: boolean;
  theme: 'light' | 'dark';
  onClose: () => void;
  onSelectHome: () => void;
  onSelectArchived: () => void;
  onToggleReorderBoxes: () => void;
  onToggleReminders: () => void;
  onToggleTheme: () => void;
  onOpenBackup: () => void;
}

export function NavigationDrawer({
  open,
  currentView,
  archivedCount,
  canReorderBoxes,
  reorderBoxesMode,
  remindersEnabled,
  remindersSupported,
  theme,
  onClose,
  onSelectHome,
  onSelectArchived,
  onToggleReorderBoxes,
  onToggleReminders,
  onToggleTheme,
  onOpenBackup,
}: NavigationDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="drawer-panel">
        <div className="drawer-header">
          <div>
            <h2 className="drawer-brand">ToDoMind</h2>
            <span className="drawer-version">v2.5 · Offline-first</span>
          </div>
          <button
            type="button"
            className="icon-btn-sm"
            aria-label="Fechar menu"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-scroll">
          <div className="drawer-section">
            <span className="drawer-section-label">Visões</span>

            <button
              type="button"
              className={`drawer-item ${currentView === 'home' ? 'is-active' : ''}`}
              onClick={() => {
                onSelectHome();
                onClose();
              }}
            >
              <LayoutGrid size={17} />
              <span className="drawer-item-text">Minhas caixas</span>
            </button>

            <button
              type="button"
              className={`drawer-item ${currentView === 'archived' ? 'is-active' : ''}`}
              onClick={() => {
                onSelectArchived();
                onClose();
              }}
            >
              <Archive size={17} />
              <span className="drawer-item-text">Caixas arquivadas</span>
              {archivedCount > 0 && (
                <span className="drawer-badge">{archivedCount}</span>
              )}
            </button>
          </div>

          <div className="drawer-section">
            <span className="drawer-section-label">Organização</span>

            {canReorderBoxes && (
              <button
                type="button"
                className={`drawer-item ${reorderBoxesMode ? 'is-active' : ''}`}
                onClick={() => {
                  onToggleReorderBoxes();
                  onClose();
                }}
              >
                <ArrowUpDown size={17} />
                <span className="drawer-item-text">
                  {reorderBoxesMode
                    ? 'Sair da reordenação'
                    : 'Reordenar caixas'}
                </span>
              </button>
            )}

            <button
              type="button"
              className={`drawer-item ${remindersEnabled ? 'is-active' : ''}`}
              disabled={!remindersSupported}
              onClick={() => {
                onToggleReminders();
              }}
            >
              {remindersEnabled ? <Bell size={17} /> : <BellOff size={17} />}
              <span className="drawer-item-text">Lembretes de horário</span>
              <span className="drawer-pill-state">
                {!remindersSupported
                  ? 'Indisp.'
                  : remindersEnabled
                    ? 'Ativo'
                    : 'Off'}
              </span>
            </button>
          </div>

          <div className="drawer-section">
            <span className="drawer-section-label">Preferências & Dados</span>

            <button
              type="button"
              className="drawer-item"
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              <span className="drawer-item-text">
                {theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              </span>
            </button>

            <button
              type="button"
              className="drawer-item"
              onClick={() => {
                onClose();
                onOpenBackup();
              }}
            >
              <HardDriveDownload size={17} />
              <span className="drawer-item-text">Backup local (JSON)</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
