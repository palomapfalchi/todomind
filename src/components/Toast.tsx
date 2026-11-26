import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast-pill">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
