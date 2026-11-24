import { useMemo, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { CornerDownLeft, Layers } from 'lucide-react';
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
  const [multiLineMode, setMultiLineMode] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveListId = useMemo(() => {
    if (selectedListId && lists.some((l) => l.id === selectedListId)) {
      return selectedListId;
    }
    return inboxId ?? lists[0]?.id ?? null;
  }, [selectedListId, lists, inboxId]);

  const parsedLines = useMemo(() => parseBatchLines(text), [text]);
  const isMulti = multiLineMode || text.includes('\n');

  const triggerDump = async () => {
    if (!effectiveListId || parsedLines.length === 0 || saving) return;
    setSaving(true);
    try {
      const count = await onDump(effectiveListId, text);
      const targetName =
        lists.find((l) => l.id === effectiveListId)?.name ?? 'Despejo';
      setText('');
      setMultiLineMode(false);
      setFeedback(
        count === 1
          ? `Adicionado em ${targetName}`
          : `${count} ações adicionadas em ${targetName}`
      );
      window.setTimeout(() => {
        setFeedback((prev) =>
          prev?.includes(targetName) ? null : prev
        );
      }, 2400);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await triggerDump();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // No modo linha única, Enter salva direto; Shift+Enter quebra linha
    if (e.key === 'Enter' && !e.shiftKey && !multiLineMode && !text.includes('\n')) {
      e.preventDefault();
      void triggerDump();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
            className={`quick-dump-textarea ${isMulti ? 'is-expanded' : ''}`}
            rows={isMulti ? 3 : 1}
            placeholder={
              isMulti
                ? 'Digite ou cole várias linhas — cada linha vira uma ação...'
                : 'Tirar da cabeça... (uma ou várias linhas)'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="quick-dump-controls">
            <button
              type="button"
              className={`icon-btn-sm ${multiLineMode ? 'is-active' : ''}`}
              title={
                multiLineMode
                  ? 'Voltar para entrada simples'
                  : 'Modo várias linhas (lote)'
              }
              aria-label="Alternar modo várias linhas"
              onClick={() => {
                setMultiLineMode((prev) => !prev);
                inputRef.current?.focus();
              }}
            >
              <Layers size={17} />
            </button>

            <button
              type="submit"
              className="btn-dump-submit"
              disabled={parsedLines.length === 0 || !effectiveListId || saving}
            >
              <CornerDownLeft size={16} />
              <span>
                {parsedLines.length > 1
                  ? `Salvar (${parsedLines.length})`
                  : 'Salvar'}
              </span>
            </button>
          </div>
        </div>

        <div className="quick-dump-footer">
          <div className="quick-dump-targets" role="group" aria-label="Caixa de destino">
            {lists.map((list) => {
              if (!list.id) return null;
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
                  <Icon size={13} />
                  <span>{list.name}</span>
                </button>
              );
            })}
          </div>

          {feedback && (
            <span className="quick-dump-feedback" role="status">
              {feedback}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
