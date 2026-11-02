import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileStatsBar } from '@/components/profile/ProfileStatsBar';
import type { FollowCounts } from '@/types';
import type { ReactNode } from 'react';

interface ProfileHeaderProps {
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  shows: number;
  artists: number;
  venues: number;
  followCounts?: FollowCounts;
  socialPanel?: 'followers' | 'following' | null;
  onToggleFollowers?: () => void;
  onToggleFollowing?: () => void;
  trailingActions?: ReactNode;
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  avatarUrl,
  shows,
  artists,
  venues,
  followCounts,
  socialPanel = null,
  onToggleFollowers,
  onToggleFollowing,
  trailingActions,
}: ProfileHeaderProps) {
  const initial = displayName.replace('@', '').slice(0, 1).toUpperCase();

  return (
    <header className="space-y-5 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <Avatar className="size-24 shrink-0 ring-1 ring-border">
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback className="bg-surface-2 font-display text-3xl font-bold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-display text-display-lg text-foreground">{displayName}</h1>
            {username ? (
              <p className="mt-0.5 text-muted-foreground">@{username}</p>
            ) : (
              <p className="mt-0.5 text-muted-foreground">No username yet</p>
            )}
            {bio && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/85">{bio}</p>
            )}
          </div>
        </div>
        {trailingActions ? <div className="shrink-0">{trailingActions}</div> : null}
      </div>

      <ProfileStatsBar
        shows={shows}
        artists={artists}
        venues={venues}
        followCounts={followCounts}
        activePanel={socialPanel}
        onFollowers={onToggleFollowers}
        onFollowing={onToggleFollowing}
      />
    </header>
  );
}
