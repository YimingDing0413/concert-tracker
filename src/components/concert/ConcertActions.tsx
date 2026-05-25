import { Button } from '@/components/ui/Button';
import type { UserConcertStatus } from '@/types';

interface ConcertActionsProps {
  status?: UserConcertStatus;
  loading?: boolean;
  onGoing: () => void;
  onAttended: () => void;
  onRate: () => void;
}

export function ConcertActions({
  status,
  loading,
  onGoing,
  onAttended,
  onRate,
}: ConcertActionsProps) {
  return (
    <div className="concert-actions">
      <Button
        variant={status === 'going' ? 'primary' : 'secondary'}
        onClick={onGoing}
        disabled={loading}
        fullWidth
      >
        {status === 'going' ? '✓ Going' : 'Mark Going'}
      </Button>
      <Button
        variant={status === 'attended' ? 'primary' : 'secondary'}
        onClick={onAttended}
        disabled={loading}
        fullWidth
      >
        {status === 'attended' ? '✓ Attended' : 'Mark Attended'}
      </Button>
      <Button variant="ghost" onClick={onRate} disabled={loading} fullWidth>
        {status === 'attended' ? 'Edit rating' : 'Add rating'}
      </Button>
    </div>
  );
}
