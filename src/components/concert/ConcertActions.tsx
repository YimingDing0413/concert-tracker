import { Button } from '@/components/ui/app-button';
import { buttonVariants } from '@/components/ui/button';
import type { UserConcertStatus } from '@/types';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ConcertActionsProps {
  /** Whether the concert itself is upcoming or has already happened. */
  concertStatus: 'upcoming' | 'past';
  userStatus?: UserConcertStatus;
  loading?: boolean;
  concertId: string;
  onGoing: () => void;
  onWant: () => void;
  onAttended: () => void;
}

export function ConcertActions({
  concertStatus,
  userStatus,
  loading,
  concertId,
  onGoing,
  onWant,
  onAttended,
}: ConcertActionsProps) {
  if (concertStatus === 'upcoming') {
    const going = userStatus === 'going';
    const want = userStatus === 'saved';
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant={going ? 'primary' : 'secondary'}
          onClick={onGoing}
          disabled={loading}
          className="min-h-11 min-w-[7rem] flex-1"
        >
          {going ? "✓ I'm going" : "I'm going"}
        </Button>
        <Button
          variant={want ? 'primary' : 'secondary'}
          onClick={onWant}
          disabled={loading}
          className="min-h-11 min-w-[7rem] flex-1"
        >
          {want ? '✓ Want tickets' : 'Want tickets'}
        </Button>
      </div>
    );
  }

  const attended = userStatus === 'attended';
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={attended ? 'primary' : 'secondary'}
        onClick={onAttended}
        disabled={loading}
        className="min-h-11 min-w-[7rem] flex-1"
      >
        {attended ? '✓ I was there' : 'I was there'}
      </Button>
      {attended ? (
        <Link
          to={`/concert/${concertId}/review`}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'default' }),
            'min-h-11 min-w-[7rem] flex-1 gap-1.5'
          )}
        >
          <Star className="size-4" aria-hidden />
          Add review
        </Link>
      ) : (
        <Link
          to={`/concert/${concertId}/review`}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'default' }),
            'min-h-11 min-w-[7rem] flex-1 gap-1.5'
          )}
        >
          <Star className="size-4" aria-hidden />
          Review
        </Link>
      )}
    </div>
  );
}
