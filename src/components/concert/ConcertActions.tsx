import { Button } from '@/components/ui/app-button';
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
    <div className="grid gap-2 sm:grid-cols-3">
      <Button
        variant={status === 'going' ? 'primary' : 'secondary'}
        onClick={onGoing}
        disabled={loading}
        fullWidth
      >
        {status === 'going' ? '✓ Going' : 'Add to My Concerts'}
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
        Rate concert
      </Button>
    </div>
  );
}
