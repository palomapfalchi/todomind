import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { BOX_COLORS, BOX_ICONS } from '../constants/boxes';
import type { BoxColorId, BoxIconId, TaskList } from '../db/types';
import { Modal } from './Modal';

interface BoxFormModalProps {
  open: boolean;
  initialList: TaskList | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    color: BoxColorId;
    icon: BoxIconId;
    pinned: boolean;
    isReusable: boolean;
  }) => Promise<void>;
  onRequestDelete?: (list: TaskList) => void;
}

export function BoxFormModal({
  open,
  initialList,
  onClose,
  onSubmit,
  onRequestDelete,
}: BoxFormModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<BoxColorId>('blue');
  const [icon, setIcon] = useState<BoxIconId>('list');
  const [pinned, setPinned] = useState(false);
  const [isReusable, setIsReusable] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialList?.name ?? '');
      setColor(initialList?.color ?? 'blue');
      setIcon(initialList?.icon ?? 'list');
      setPinned(initialList?.pinned ?? false);
      setIsReusable(initialList?.isReusable ?? false);
    }
  }, [open, initialList]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name,
      color,
      icon,
      pinned: initialList?.isInbox ? true : pinned,
      isReusable: initialList?.isInbox ? false : isReusable,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initialList ? 'Editar caixa' : 'Nova caixa'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="box-name">
            Nome da caixa
          </label>
          <input
            id="box-name"
            className="input"
            type="text"
            placeholder="Ex: Mercado, Presentes, Compromissos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <span className="form-label">Cor</span>
          <div className="color-picker-row">
            {BOX_COLORS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`color-swatch-btn ${color === option.id ? 'is-selected' : ''}`}
                style={{ backgroundColor: option.swatch }}
                aria-label={option.label}
                title={option.label}
                onClick={() => setColor(option.id)}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Ícone</span>
          <div className="icon-picker-grid">
            {BOX_ICONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`icon-choice-btn ${icon === id ? 'is-selected' : ''}`}
                title={label}
                aria-label={label}
                onClick={() => setIcon(id)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {!initialList?.isInbox && (
          <div className="checkbox-stack">
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              <span>Fixar esta caixa no topo da tela</span>
            </label>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={isReusable}
                onChange={(e) => setIsReusable(e.target.checked)}
              />
              <span>
                Caixa reutilizável (habilita botão &ldquo;Resetar checklist&rdquo;
                para mercado ou rotinas)
              </span>
            </label>
          </div>
        )}

        <div className="modal-actions modal-actions-spread">
          <div>
            {initialList && !initialList.isInbox && onRequestDelete && (
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => {
                  onClose();
                  onRequestDelete(initialList);
                }}
              >
                <Trash2 size={16} />
                <span>Excluir</span>
              </button>
            )}
          </div>
          <div className="modal-actions-right">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
