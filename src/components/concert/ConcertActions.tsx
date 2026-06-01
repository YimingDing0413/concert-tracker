import { Button } from '@/components/ui/app-button';
import type { UserConcertStatus } from '@/types';

interface ConcertActionsProps {
  /** Whether the concert itself is upcoming or has already happened. */
  concertStatus: 'upcoming' | 'past';
  userStatus?: UserConcertStatus;
  loading?: boolean;
  onGoing: () => void;
  onAttended: () => void;
}

export function ConcertActions({
  concertStatus,
  userStatus,
  loading,
  onGoing,
  onAttended,
}: ConcertActionsProps) {
  if (concertStatus === 'upcoming') {
    const going = userStatus === 'going';
    return (
      <Button
        variant={going ? 'primary' : 'secondary'}
        onClick={onGoing}
        disabled={loading}
        fullWidth
      >
        {going ? '✓ Going' : 'Mark going'}
      </Button>
    );
  }

  const attended = userStatus === 'attended';
  return (
    <Button
      variant={attended ? 'primary' : 'secondary'}
      onClick={onAttended}
      disabled={loading}
      fullWidth
    >
      {attended ? '✓ Attended' : 'Mark attended'}
    </Button>
  );
}
