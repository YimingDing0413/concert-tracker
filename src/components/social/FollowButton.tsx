import { Button } from '@/components/ui/app-button';
import { HttpApiError } from '@/api/http';
import { followUser, unfollowUser } from '@/lib/social/socialApi';
import type { FollowCounts } from '@/types';
import { cn } from '@/lib/utils';
import { Check, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  initialFollowing?: boolean;
  onChange?: (following: boolean, counts?: FollowCounts) => void;
  /** Show a disabled "You" pill instead of nothing when viewing yourself. */
  showSelfLabel?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function FollowButton({
  currentUserId,
  targetUserId,
  initialFollowing = false,
  onChange,
  showSelfLabel = false,
  size = 'sm',
  className,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSelf = currentUserId === targetUserId;

  if (isSelf) {
    if (!showSelfLabel) return null;
    return (
      <span className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground">
        You
      </span>
    );
  }

  async function toggle() {
    if (loading) return;
    setLoading(true);
    setError('');
    const next = !following;
    setFollowing(next); // optimistic
    try {
      const res = next
        ? await followUser(currentUserId, targetUserId)
        : await unfollowUser(currentUserId, targetUserId);
      setFollowing(res.following);
      onChange?.(res.following, res.counts);
    } catch (err) {
      setFollowing(!next); // revert
      setError(err instanceof HttpApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={following ? 'secondary' : 'primary'}
      size={size}
      disabled={loading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      title={error || undefined}
      className={cn('rounded-full px-4', className)}
    >
      {following ? (
        <>
          <Check className="size-3.5" aria-hidden />
          Following
        </>
      ) : (
        <>
          <UserPlus className="size-3.5" aria-hidden />
          Follow
        </>
      )}
    </Button>
  );
}
