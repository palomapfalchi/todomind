import { CalendarClock, Sunrise } from 'lucide-react';

interface OverdueBannerProps {
  count: number;
  onBringToToday: () => void;
  onMoveToTomorrow: () => void;
}

export function OverdueBanner({
  count,
  onBringToToday,
  onMoveToTomorrow,
}: OverdueBannerProps) {
  if (count <= 0) return null;

  return (
    <section className="gentle-overdue-banner" aria-label="Reorganizar ações de dias anteriores">
      <div className="gentle-overdue-text">
        <CalendarClock size={16} aria-hidden="true" />
        <span>
          <strong>
            {count} ação{count === 1 ? '' : 'ões'}
          </strong>{' '}
          de dias anteriores — sem culpa, quer reorganizar?
        </span>
      </div>

      <div className="gentle-overdue-actions">
        <button
          type="button"
          className="btn-gentle-primary"
          onClick={onBringToToday}
        >
          Trazer para hoje
        </button>
        <button
          type="button"
          className="btn-gentle-secondary"
          onClick={onMoveToTomorrow}
        >
          <Sunrise size={13} />
          <span>Adiar p/ amanhã</span>
        </button>
      </div>
    </section>
  );
}
