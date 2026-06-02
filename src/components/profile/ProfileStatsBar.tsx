import type { ProfileActivityStats } from '@/lib/profileStats';
import type { FollowCounts } from '@/types';
import { cn } from '@/lib/utils';

interface ProfileStatsBarProps {
  stats: ProfileActivityStats;
  followCounts: FollowCounts;
  activePanel: 'followers' | 'following' | null;
  onConcerts: () => void;
  onFollowers: () => void;
  onFollowing: () => void;
  onReviews?: () => void;
  onWrapUps?: () => void;
  /** Hide review/wrap stat pills on public profiles */
  showReviewStats?: boolean;
}

function StatPill({
  value,
  label,
  onClick,
  active,
}: {
  value: number | string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const inner = (
    <>
      <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );

  if (!onClick) {
    return <div className="flex min-w-[4.5rem] flex-col items-center text-center md:items-start md:text-left">{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[4.5rem] flex-col items-center text-center transition-opacity hover:opacity-80 md:items-start md:text-left',
        active && 'rounded-lg ring-1 ring-primary/40'
      )}
    >
      {inner}
    </button>
  );
}

export function ProfileStatsBar({
  stats,
  followCounts,
  activePanel,
  onConcerts,
  onFollowers,
  onFollowing,
  onReviews,
  onWrapUps,
  showReviewStats = true,
}: ProfileStatsBarProps) {
  return (
    <div className="mt-4 flex flex-wrap items-start justify-center gap-x-6 gap-y-3 md:justify-start">
      <StatPill value={stats.concerts} label="Concerts" onClick={onConcerts} />
      <StatPill
        value={followCounts.followersCount}
        label="Followers"
        onClick={onFollowers}
        active={activePanel === 'followers'}
      />
      <StatPill
        value={followCounts.followingCount}
        label="Following"
        onClick={onFollowing}
        active={activePanel === 'following'}
      />
      {showReviewStats && (
        <>
          <StatPill value={stats.reviews} label="Reviews" onClick={onReviews} />
          <StatPill value={stats.wrapUps} label="Wrap-Ups" onClick={onWrapUps} />
        </>
      )}
    </div>
  );
}
