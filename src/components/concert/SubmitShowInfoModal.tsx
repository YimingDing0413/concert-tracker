import { Button } from '@/components/ui/Button';
import type { ShowReportConfidence, ShowReportInput, ShowReportSourceType } from '@/types';
import { useEffect, useState } from 'react';

const SOURCE_OPTIONS: { value: ShowReportSourceType; label: string }[] = [
  { value: 'was_there', label: 'I was there' },
  { value: 'venue_email', label: 'Venue email' },
  { value: 'artist_post', label: 'Artist post' },
  { value: 'venue_post', label: 'Venue post' },
  { value: 'ticket_email', label: 'Ticket email' },
  { value: 'other', label: 'Other' },
];

const CONFIDENCE_OPTIONS: { value: ShowReportConfidence; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface SubmitShowInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ShowReportInput) => Promise<void>;
  submitting?: boolean;
}

const emptyForm = (): ShowReportInput => ({});

export function SubmitShowInfoModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: SubmitShowInfoModalProps) {
  const [form, setForm] = useState<ShowReportInput>(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setError('');
    }
  }, [open]);

  if (!open) return null;

  function update<K extends keyof ShowReportInput>(key: K, value: ShowReportInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report');
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-labelledby="submit-show-info-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="submit-show-info-title">Submit show info</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Doors open time</span>
            <input
              type="text"
              placeholder="e.g. 7:00 PM"
              value={form.doorsOpenTime ?? ''}
              onChange={(e) => update('doorsOpenTime', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Opener names</span>
            <input
              type="text"
              placeholder="Artist A, Artist B"
              value={form.openerNames ?? ''}
              onChange={(e) => update('openerNames', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Opener start time</span>
            <input
              type="text"
              placeholder="e.g. 7:30 PM"
              value={form.openerStartTime ?? ''}
              onChange={(e) => update('openerStartTime', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Headliner start time</span>
            <input
              type="text"
              placeholder="e.g. 9:15 PM"
              value={form.headlinerStartTime ?? ''}
              onChange={(e) => update('headlinerStartTime', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>End time</span>
            <input
              type="text"
              placeholder="e.g. 11:00 PM"
              value={form.endTime ?? ''}
              onChange={(e) => update('endTime', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Notes</span>
            <textarea
              rows={3}
              placeholder="Anything else fans should know"
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Source type</span>
            <select
              value={form.sourceType ?? ''}
              onChange={(e) =>
                update('sourceType', (e.target.value || undefined) as ShowReportSourceType | undefined)
              }
            >
              <option value="">Optional</option>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Source URL</span>
            <input
              type="url"
              placeholder="https://"
              value={form.sourceUrl ?? ''}
              onChange={(e) => update('sourceUrl', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Your confidence</span>
            <select
              value={form.confidence ?? ''}
              onChange={(e) =>
                update(
                  'confidence',
                  (e.target.value || undefined) as ShowReportConfidence | undefined
                )
              }
            >
              <option value="">Optional</option>
              {CONFIDENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
