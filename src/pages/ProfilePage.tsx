import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { ProfileReviewListItem } from '@/components/review/ProfileReviewListItem';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChip } from '@/components/ui/FilterChip';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { getAllConcertReviews } from '@/lib/concertReviewsLocal';
import type { Concert, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { averageOverallRating, formatOverallRating } from '@/utils/format';
import { Calendar, LogOut, MapPinned, Music2, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type ProfileTab = 'overview' | 'ratings';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [localReviews, setLocalReviews] = useState<ConcertReview[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLocalReviews = useCallback(() => {
    if (!user) {
      setLocalReviews([]);
      return;
    }
    setLocalReviews(getAllConcertReviews(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refreshLocalReviews();
    Promise.all([api.getUserConcerts(user.id), api.getConcerts()])
      .then(([ucs, all]) => {
        setUserConcerts(ucs);
        setConcerts(all);
      })
      .finally(() => setLoading(false));
  }, [user, refreshLocalReviews]);

  useEffect(() => {
    refreshLocalReviews();
  }, [location.pathname, refreshLocalReviews]);

  const reviewByEvent = useMemo(() => {
    const map = new Map<string, ConcertReview>();
    for (const r of localReviews) map.set(r.eventId, r);
    return map;
  }, [localReviews]);

  const stats = useMemo(() => {
    const attended = userConcerts.filter((uc) => uc.status === 'attended');
    const avgOverall = averageOverallRating(localReviews.map((r) => r.overallRating));
    return {
      attended: attended.length,
      total: userConcerts.length,
      avgOverall,
      avgDisplay: formatOverallRating(avgOverall),
      reviewCount: localReviews.length,
    };
  }, [userConcerts, localReviews]);

  const recent = useMemo(() => {
    return [...userConcerts]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [userConcerts]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="space-y-6">
        <ListRowSkeleton count={3} />
      </div>
    );
  }

  function resolveConcert(uc: UserConcert) {
    if (uc.concertSnapshot) return uc.concertSnapshot as Partial<Concert>;
    if (uc.isManual && uc.manualConcert) return uc.manualConcert as Partial<Concert>;
    return concerts.find((c) => c.id === uc.concertId);
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col items-center rounded-3xl border border-border/60 bg-card/50 p-6 text-center shadow-lg md:flex-row md:items-start md:text-left">
        <Avatar className="size-20 border-2 border-primary/30 md:mr-5">
          <AvatarImage src={user.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/20 text-2xl text-primary">
            {user.displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="mt-4 min-w-0 flex-1 md:mt-0">
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-muted-foreground">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm text-foreground/90">{user.bio}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <Button
              variant="ghost"
              size="default"
              onClick={() => logout()}
              className="h-10 gap-2 px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Concerts" value={stats.total} icon={Calendar} />
        <StatCard label="Attended" value={stats.attended} icon={Music2} />
        <StatCard
          label="Avg rating"
          value={stats.avgDisplay}
          icon={Star}
          onClick={() => setTab('ratings')}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Profile sections">
        <FilterChip
          active={tab === 'overview'}
          onClick={() => setTab('overview')}
          aria-selected={tab === 'overview'}
        >
          Overview
        </FilterChip>
        <FilterChip
          active={tab === 'ratings'}
          onClick={() => setTab('ratings')}
          aria-selected={tab === 'ratings'}
        >
          Ratings ({stats.reviewCount})
        </FilterChip>
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <section>
            <SectionHeader title="Recent concerts" actionTo="/my-concerts" actionLabel="See all" />
            {recent.length === 0 ? (
              <EmptyState
                title="No concerts yet"
                description="Discover shows or add one manually."
                action={
                  <Link to="/" className="text-sm font-medium text-primary">
                    Discover →
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {recent.map((uc) => {
                  const c = resolveConcert(uc);
                  const review = reviewByEvent.get(uc.concertId);
                  return c ? (
                    <div key={uc.id} className="relative">
                      <ConcertCard
                        concert={c}
                        userConcert={uc}
                        concertId={uc.concertId}
                        variant="compact"
                        showCta={false}
                      />
                      {review && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {review.overallRating}/10
                        </span>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </section>

          {stats.reviewCount > 0 && (
            <button
              type="button"
              onClick={() => setTab('ratings')}
              className="w-full rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-medium text-primary hover:bg-primary/10"
            >
              View all {stats.reviewCount} rating{stats.reviewCount === 1 ? '' : 's'} →
            </button>
          )}

          <Link
            to="/map"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-8 text-sm font-medium text-primary no-underline hover:bg-primary/10"
          >
            <MapPinned className="size-5" aria-hidden />
            Preview your concert map
          </Link>
        </div>
      )}

      {tab === 'ratings' && (
        <section className="space-y-4">
          <SectionHeader
            title="Your ratings"
            subtitle={
              stats.avgOverall != null
                ? `Average across ${stats.reviewCount} review${stats.reviewCount === 1 ? '' : 's'}: ${stats.avgDisplay}`
                : 'Rate concerts from any event page'
            }
          />
          {localReviews.length === 0 ? (
            <EmptyState
              title="No ratings yet"
              description="Open a concert you attended and tap Rate this concert to log your first review."
              action={
                <Link to="/my-concerts" className="text-sm font-medium text-primary">
                  My concerts →
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {localReviews.map((review) => (
                <li key={review.id}>
                  <ProfileReviewListItem review={review} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
