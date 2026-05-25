import type { ConcertTiming as Timing } from '@/types';
import { formatTime } from '@/utils/format';

interface ConcertTimingProps {
  timing?: Timing;
}

const TIMING_FIELDS = [
  { key: 'doorsOpen' as const, label: 'Doors open' },
  { key: 'openerStart' as const, label: 'Opener start' },
  { key: 'headlinerStart' as const, label: 'Headliner start' },
  { key: 'endTime' as const, label: 'End time' },
];

export function ConcertTimingGrid({ timing }: ConcertTimingProps) {
  return (
    <section className="timing-section card">
      <h3>Show timing</h3>
      <p className="timing-hint muted">
        Doors, opener, and headliner times are often missing from public APIs. You can add
        them manually or import from a ticket email later.
      </p>
      <div className="timing-grid">
        {TIMING_FIELDS.map(({ key, label }) => {
          const value = timing?.[key];
          return (
            <div key={key} className="timing-item">
              <span className="timing-label">{label}</span>
              <span className={`timing-value ${!value ? 'timing-na' : ''}`}>
                {value ? formatTime(value) : 'Not available yet'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
