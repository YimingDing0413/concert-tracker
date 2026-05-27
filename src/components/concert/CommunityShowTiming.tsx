import { SubmitShowInfoModal } from '@/components/concert/SubmitShowInfoModal';
import { Button } from '@/components/ui/app-button';
import type { AggregatedField, AggregatedShowTiming, ShowReportInput } from '@/types';
import { formatTime } from '@/utils/format';
import { confidenceLabelText } from '@shared/showReports';
import { useState } from 'react';

interface CommunityShowTimingProps {
  aggregated: AggregatedShowTiming;
  reportCount: number;
  onSubmit: (input: ShowReportInput) => Promise<void>;
  submitting?: boolean;
}

const FIELDS: {
  key: keyof Pick<
    AggregatedShowTiming,
    'doorsOpenTime' | 'openerNames' | 'openerStartTime' | 'headlinerStartTime' | 'endTime'
  >;
  label: string;
  isTime?: boolean;
  isOpeners?: boolean;
}[] = [
  { key: 'doorsOpenTime', label: 'Doors open', isTime: true },
  { key: 'openerNames', label: 'Openers', isOpeners: true },
  { key: 'openerStartTime', label: 'Opener start', isTime: true },
  { key: 'headlinerStartTime', label: 'Headliner start', isTime: true },
  { key: 'endTime', label: 'End time', isTime: true },
];

function formatFieldValue(
  field: AggregatedField | undefined,
  opts: { isTime?: boolean; isOpeners?: boolean }
): string {
  if (!field) return 'Unknown';
  if (opts.isOpeners && Array.isArray(field.value)) {
    return field.value.join(', ');
  }
  if (opts.isTime && typeof field.value === 'string') {
    return formatTime(field.value);
  }
  if (typeof field.value === 'string') return field.value;
  return 'Unknown';
}

function agreementText(field: AggregatedField): string {
  const { reportCount, totalReports } = field;
  if (reportCount === totalReports && reportCount > 0) {
    return `Reported by ${reportCount} fan${reportCount === 1 ? '' : 's'}`;
  }
  return `${reportCount} of ${totalReports} report${totalReports === 1 ? '' : 's'} agree`;
}

function metaLine(field: AggregatedField | undefined): string | null {
  if (!field) return null;
  return `${agreementText(field)} · ${confidenceLabelText(field.confidenceLabel)}`;
}

export function CommunityShowTiming({
  aggregated,
  reportCount,
  onSubmit,
  submitting,
}: CommunityShowTimingProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasReports = reportCount > 0;

  return (
    <section className="timing-section card community-timing">
      <div className="community-timing-header">
        <h3>Show timing</h3>
        <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
          {hasReports ? 'Update info' : 'Add info'}
        </Button>
      </div>
      <p className="timing-hint muted">
        Detailed show times are community-sourced because public ticketing APIs rarely provide
        this information. The most commonly reported answer is shown first.
      </p>
      <div className="community-timing-list">
        {FIELDS.map(({ key, label, isTime, isOpeners }) => {
          const field = aggregated[key];
          const value = formatFieldValue(field, { isTime, isOpeners });
          const meta = metaLine(field);
          const unknown = !field;

          return (
            <div key={key} className="community-timing-row">
              <div className="community-timing-row-top">
                <span className="community-timing-label">{label}</span>
                <Button size="sm" variant="ghost" onClick={() => setModalOpen(true)}>
                  {hasReports ? 'Update' : 'Add'}
                </Button>
              </div>
              <p className={`community-timing-value ${unknown ? 'timing-na' : ''}`}>{value}</p>
              {meta ? (
                <p className="community-timing-meta muted">{meta}</p>
              ) : (
                <p className="community-timing-meta muted">No reports yet</p>
              )}
            </div>
          );
        })}
      </div>
      {reportCount > 0 && (
        <p className="community-timing-total muted">
          {reportCount} community report{reportCount === 1 ? '' : 's'} for this show
        </p>
      )}
      <SubmitShowInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </section>
  );
}
