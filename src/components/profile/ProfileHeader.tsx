import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/app-button';
import { ProfileStatsBar } from '@/components/profile/ProfileStatsBar';
import type { FollowCounts } from '@/types';
import { Pencil, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface ProfileHeaderProps {
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  followCounts: FollowCounts;
  socialPanel: 'followers' | 'following' | null;
  onToggleFollowers: () => void;
  onToggleFollowing: () => void;
  onEditProfile?: () => void;
  onCreateWrapUp?: () => void;
  editLabel?: string;
  trailingActions?: ReactNode;
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  avatarUrl,
  followCounts,
  socialPanel,
  onToggleFollowers,
  onToggleFollowing,
  onEditProfile,
  onCreateWrapUp,
  editLabel = 'Edit profile',
  trailingActions,
}: ProfileHeaderProps) {
  const initial = displayName.replace('@', '').slice(0, 1).toUpperCase();

  return (
    <header className="space-y-5 pb-2">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <Avatar className="size-24 shrink-0 border-2 border-border/60 ring-2 ring-primary/20">
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-violet-900/40 text-3xl font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
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

      <ProfileStatsBar
        followCounts={followCounts}
        activePanel={socialPanel}
        onFollowers={onToggleFollowers}
        onFollowing={onToggleFollowing}
      />

      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {trailingActions ?? (
          <>
            {onEditProfile && (
              <Button
                variant="secondary"
                size="default"
                onClick={onEditProfile}
                className="h-10 gap-2 rounded-full px-5 text-sm font-medium"
              >
                <Pencil className="size-4" aria-hidden />
                {editLabel}
              </Button>
            )}
            {onCreateWrapUp && (
              <Button
                variant="primary"
                size="default"
                onClick={onCreateWrapUp}
                className="h-10 gap-2 rounded-full px-5 text-sm font-medium"
              >
                <Sparkles className="size-4" aria-hidden />
                Create Year Wrap-Up
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
