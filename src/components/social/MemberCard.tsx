import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/social/FollowButton';
import type { FollowCounts } from '@/types';
import { Link } from 'react-router-dom';

interface MemberCardProps {
  currentUserId: string;
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  followersCount?: number;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean, counts?: FollowCounts) => void;
  /** Render an Unfollow-style action even when following (used in lists). */
  showFollowButton?: boolean;
}

function initial(name?: string, username?: string): string {
  const source = name?.trim() || username?.trim() || '?';
  return source.slice(0, 1).toUpperCase();
}

export function MemberCard({
  currentUserId,
  userId,
  username,
  displayName,
  avatarUrl,
  followersCount,
  initialFollowing,
  onFollowChange,
  showFollowButton = true,
}: MemberCardProps) {
  const name = displayName?.trim() || (username ? `@${username}` : 'Member');

  return (
    <Link
      to={`/member/${encodeURIComponent(userId)}`}
      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3 no-underline transition-colors hover:bg-card/80"
    >
      <Avatar className="size-12 border border-border/50">
        <AvatarImage src={avatarUrl} alt="" />
        <AvatarFallback className="bg-primary/20 text-primary">
          {initial(displayName, username)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {username && (
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        )}
        {typeof followersCount === 'number' && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {followersCount} follower{followersCount === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {showFollowButton && (
        <FollowButton
          currentUserId={currentUserId}
          targetUserId={userId}
          initialFollowing={initialFollowing}
          onChange={onFollowChange}
        />
      )}
    </Link>
  );
}
