import {
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { CornerDownLeft } from 'lucide-react';
import { getBoxIcon } from '../constants/boxes';
import { parseBatchLines } from '../db/repositories';
import type { TaskList } from '../db/types';

interface QuickDumpBarProps {
  lists: TaskList[];
  inboxId: number | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onDump: (listId: number, rawText: string) => Promise<number>;
}

export function QuickDumpBar({
  lists,
  inboxId,
  inputRef,
  onDump,
}: QuickDumpBarProps) {
  const [text, setText] = useState('');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveListId = useMemo(() => {
    if (selectedListId != null && lists.some((l) => l.id === selectedListId)) {
      return selectedListId;
    }
    return inboxId ?? lists[0]?.id ?? null;
  }, [selectedListId, lists, inboxId]);

  const parsedLines = useMemo(() => parseBatchLines(text), [text]);
  const rawLineCount = useMemo(
    () => (text.length === 0 ? 1 : text.split(/\r?\n/).length),
    [text]
  );
  const textareaRows = Math.min(Math.max(rawLineCount, 2), 6);

  const triggerDump = async () => {
    if (effectiveListId == null || parsedLines.length === 0 || saving) return;
    setSaving(true);
    try {
      await onDump(effectiveListId, text);
      setText('');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await triggerDump();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter quebra linha naturalmente (para criar várias tarefas de uma vez no celular e PC).
    // Ctrl+Enter / Cmd+Enter envia rapidamente pelo teclado no PC.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void triggerDump();
    }
  };

  return (
    <section className="quick-dump-panel" aria-label="Despejo rápido">
      <form className="quick-dump-form" onSubmit={handleSubmit}>
        <div className="quick-dump-input-row">
          <textarea
            ref={inputRef}
            className="quick-dump-textarea"
            rows={textareaRows}
            placeholder={
              'Tirar da cabeça...\nPule linha (Enter) para criar várias ações de uma vez'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            className="btn-dump-submit"
            disabled={parsedLines.length === 0 || effectiveListId == null || saving}
          >
            <CornerDownLeft size={15} />
            <span>
              {parsedLines.length > 1
                ? `Salvar (${parsedLines.length})`
                : 'Salvar'}
            </span>
          </button>
        </div>

        <div className="quick-dump-footer">
          <div
            className="quick-dump-targets"
            role="group"
            aria-label="Caixa de destino"
          >
            {lists.map((list) => {
              if (list.id == null) return null;
              const Icon = getBoxIcon(list.icon);
              const isSelected = list.id === effectiveListId;
              return (
                <button
                  key={list.id}
                  type="button"
                  className={`target-chip ${isSelected ? 'is-selected' : ''}`}
                  data-color={list.color || 'blue'}
                  onClick={() => setSelectedListId(list.id!)}
                >
                  <Icon size={12} />
                  <span>{list.name}</span>
                </button>
              );
            })}
          </div>

          {parsedLines.length > 1 && (
            <span className="quick-dump-hint">
              {parsedLines.length} ações serão criadas
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
