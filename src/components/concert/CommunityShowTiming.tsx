import { SubmitShowInfoModal } from '@/components/concert/SubmitShowInfoModal';
import { Button } from '@/components/ui/app-button';
import type { AggregatedField, AggregatedShowTiming, ShowReportInput } from '@/types';
import { formatTime } from '@/utils/format';
import { confidenceLabelText } from '@shared/showReports';
import { Clock } from 'lucide-react';
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
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-5 text-primary" aria-hidden />
            Show timing
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Community-sourced — ticketing APIs rarely include this detail.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
          {hasReports ? 'Update' : 'Add info'}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, isTime, isOpeners }) => {
          const field = aggregated[key];
          const unknown = !field;
          const value = formatFieldValue(field, { isTime, isOpeners });
          const meta = metaLine(field);

          return (
            <div
              key={key}
              className="rounded-xl border border-border/50 bg-muted/20 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className={`mt-1 text-base font-medium ${unknown ? 'text-muted-foreground' : ''}`}>
                {value}
              </p>
              {unknown ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Help the community by adding this info
                </p>
              ) : (
                meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
              )}
            </div>
          );
        })}
      </div>
      {reportCount > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
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
