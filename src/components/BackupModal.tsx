import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportBackupData, importBackupData } from '../db/repositories';
import { Modal } from './Modal';

interface BackupModalProps {
  open: boolean;
  listsCount: number;
  tasksCount: number;
  onClose: () => void;
}

export function BackupModal({
  open,
  listsCount,
  tasksCount,
  onClose,
}: BackupModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(null);
    }
  }, [open]);

  const handleExport = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const payload = await exportBackupData();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);

      const link = document.createElement('a');
      link.href = url;
      link.download = `todomind-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: `Backup exportado (${payload.lists.length} caixas e ${payload.tasks.length} ações).`,
      });
    } catch {
      setStatus({
        type: 'error',
        message: 'Não foi possível gerar o arquivo de backup.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);

    try {
      const rawText = await file.text();
      const result = await importBackupData(rawText, importMode);
      setStatus({
        type: 'success',
        message: `Backup importado: ${result.listsImported} caixa(s) e ${result.tasksImported} ação(ões).`,
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erro ao importar o backup.',
      });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <Modal open={open} title="Backup local (JSON)" onClose={onClose}>
      <p className="backup-intro">
        Seus dados ficam salvos apenas neste dispositivo ({listsCount}{' '}
        caixa{listsCount === 1 ? '' : 's'} e {tasksCount}{' '}
        {tasksCount === 1 ? 'ação' : 'ações'}). Exporte um arquivo JSON sempre que
        quiser guardar uma cópia de segurança.
      </p>

      <div className="backup-section">
        <button
          type="button"
          className="btn btn-primary btn-full"
          disabled={busy}
          onClick={handleExport}
        >
          <Download size={17} />
          <span>Exportar backup (.json)</span>
        </button>
      </div>

      <div className="backup-section backup-divider">
        <span className="form-label">Importar backup</span>

        <div className="radio-stack">
          <label className="radio-option">
            <input
              type="radio"
              name="import-mode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            <div>
              <strong>Mesclar com os dados atuais</strong>
              <p>Mantém suas caixas atuais e adiciona as do arquivo.</p>
            </div>
          </label>

          <label className="radio-option">
            <input
              type="radio"
              name="import-mode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
            />
            <div>
              <strong>Substituir tudo</strong>
              <p>Apaga os dados deste dispositivo e restaura o arquivo.</p>
            </div>
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="btn btn-full"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={17} />
          <span>Selecionar arquivo JSON</span>
        </button>
      </div>

      {status && (
        <div
          className={`backup-status ${status.type === 'error' ? 'is-error' : 'is-success'}`}
          role="status"
        >
          {status.message}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
