import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/app-button';
import { ProfileStatsBar } from '@/components/profile/ProfileStatsBar';
import type { ProfileActivityStats } from '@/lib/profileStats';
import type { FollowCounts } from '@/types';
import { Pencil, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface ProfileHeaderProps {
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  stats: ProfileActivityStats;
  followCounts: FollowCounts;
  socialPanel: 'followers' | 'following' | null;
  onToggleFollowers: () => void;
  onToggleFollowing: () => void;
  onConcertsClick: () => void;
  onReviewsClick?: () => void;
  onWrapUpsClick?: () => void;
  showReviewStats?: boolean;
  onEditProfile?: () => void;
  onCreateWrapUp?: () => void;
  editLabel?: string;
  /** Public profile: follow button. Own: undefined uses default buttons. */
  trailingActions?: ReactNode;
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  avatarUrl,
  stats,
  followCounts,
  socialPanel,
  onToggleFollowers,
  onToggleFollowing,
  onConcertsClick,
  onReviewsClick,
  onWrapUpsClick,
  showReviewStats = true,
  onEditProfile,
  onCreateWrapUp,
  editLabel = 'Edit profile',
  trailingActions,
}: ProfileHeaderProps) {
  const initial = displayName.replace('@', '').slice(0, 1).toUpperCase();

  return (
    <header className="rounded-3xl border border-border/60 bg-card/50 p-5 shadow-lg sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="mx-auto size-20 shrink-0 border-2 border-primary/30 sm:mx-0 sm:size-24">
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/20 text-2xl text-primary">{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
          {username ? (
            <p className="text-muted-foreground">@{username}</p>
          ) : (
            <p className="text-muted-foreground">No username yet</p>
          )}
          {bio && <p className="mt-2 text-sm leading-relaxed text-foreground/90">{bio}</p>}

          <ProfileStatsBar
            stats={stats}
            followCounts={followCounts}
            activePanel={socialPanel}
            onConcerts={onConcertsClick}
            onFollowers={onToggleFollowers}
            onFollowing={onToggleFollowing}
            onReviews={onReviewsClick}
            onWrapUps={onWrapUpsClick}
            showReviewStats={showReviewStats}
          />

          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {trailingActions ?? (
              <>
                {onEditProfile && (
                  <Button
                    variant="secondary"
                    size="default"
                    onClick={onEditProfile}
                    className="h-10 gap-2 rounded-full px-4 text-sm font-medium"
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
                    className="h-10 gap-2 rounded-full px-4 text-sm font-medium"
                  >
                    <Sparkles className="size-4" aria-hidden />
                    <span className="hidden xs:inline">Create Year Wrap-Up</span>
                    <span className="xs:hidden">Wrap-Up</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
