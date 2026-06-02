import { MemberCard } from '@/components/social/MemberCard';
import { UsernameEditor } from '@/components/social/UsernameEditor';
import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/components/profile/ProfileContentTabs';
import { ProfileDesktopAside } from '@/components/profile/ProfileDesktopAside';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import { useProfileConcerts } from '@/hooks/useProfileConcerts';
import {
  getAllConcertReviews,
  REVIEWS_SYNCED_EVENT,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import { buildProfileActivityStats } from '@/lib/profileStats';
import {
  ensureMyProfile,
  getFollowCounts,
  getFollowers,
  getFollowing,
} from '@/lib/social/socialApi';
import type { FollowCounts, FollowerItem, FollowItem, UserProfile } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { Calendar, LogOut, Pencil, Sparkles, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function parseProfileTab(value: string | null): ProfileContentTab {
  if (value === 'going' || value === 'reviews' || value === 'wrapped' || value === 'concerts') {
    return value;
  }
  return 'concerts';
}

type SocialPanel = 'followers' | 'following' | null;

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followersCount: 0,
    followingCount: 0,
  });
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [followingList, setFollowingList] = useState<FollowItem[]>([]);
  const [reviews, setReviews] = useState<ConcertReview[]>([]);
  const [socialPanel, setSocialPanel] = useState<SocialPanel>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [contentTab, setContentTab] = useState<ProfileContentTab>(() =>
    parseProfileTab(searchParams.get('tab'))
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [socialLoading, setSocialLoading] = useState(true);

  const { userConcerts, concertMap, loading: concertsLoading } = useProfileConcerts(user?.id);

  const refreshSocial = useCallback(async () => {
    if (!user) return;
    const [prof, counts, fwers, fwing, syncedReviews] = await Promise.all([
      ensureMyProfile(user),
      getFollowCounts(user.id).catch(() => ({ followersCount: 0, followingCount: 0 })),
      getFollowers(user.id).catch(() => []),
      getFollowing(user.id).catch(() => []),
      syncConcertReviewsFromServer(user.id),
    ]);
    setProfile(prof);
    setFollowCounts(counts);
    setFollowers(fwers);
    setFollowingList(fwing);
    setReviews(syncedReviews);
    setSocialLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setSocialLoading(true);
    void refreshSocial();
  }, [user, refreshSocial]);

  useEffect(() => {
    if (!user) return;
    setReviews(getAllConcertReviews(user.id));
  }, [user, contentTab]);

  useEffect(() => {
    if (!user) return;
    const onSynced = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string }>).detail;
      if (detail?.userId === user.id) {
        setReviews(getAllConcertReviews(user.id));
      }
    };
    window.addEventListener(REVIEWS_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(REVIEWS_SYNCED_EVENT, onSynced);
  }, [user]);

  useEffect(() => {
    setContentTab(parseProfileTab(searchParams.get('tab')));
  }, [searchParams]);

  const selectContentTab = useCallback(
    (tab: ProfileContentTab) => {
      setSocialPanel(null);
      setContentTab(tab);
      if (tab === 'concerts') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab }, { replace: true });
      }
    },
    [setSearchParams]
  );

  const followingIds = useMemo(
    () => new Set(followingList.map((f) => f.targetUserId)),
    [followingList]
  );

  const activityStats = useMemo(
    () => buildProfileActivityStats(userConcerts, concertMap, reviews),
    [userConcerts, concertMap, reviews]
  );

  const loading = socialLoading || concertsLoading;

  if (!user) return null;
  if (loading) {
    return (
      <div className="space-y-6">
        <ListRowSkeleton count={3} />
      </div>
    );
  }

  function openContentTab(tab: ProfileContentTab) {
    selectContentTab(tab);
  }

  function toggleSocialPanel(panel: SocialPanel) {
    setSocialPanel((current) => (current === panel ? null : panel));
  }

  return (
    <div className="space-y-5 pb-4">
      <ProfileHeader
        displayName={profile?.displayName || user.displayName}
        username={profile?.username || user.username}
        bio={profile?.bio ?? user.bio}
        avatarUrl={profile?.avatarUrl ?? user.avatarUrl}
        stats={activityStats}
        followCounts={followCounts}
        socialPanel={socialPanel}
        onToggleFollowers={() => toggleSocialPanel('followers')}
        onToggleFollowing={() => toggleSocialPanel('following')}
        onConcertsClick={() => openContentTab('concerts')}
        onReviewsClick={() => openContentTab('reviews')}
        onWrapUpsClick={() => openContentTab('wrapped')}
        trailingActions={
          <>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setEditorOpen(true)}
              className="h-10 gap-2 rounded-full px-4 text-sm font-medium"
            >
              <Pencil className="size-4" aria-hidden />
              {profile?.username ? 'Edit profile' : 'Set username'}
            </Button>
            <Button
              variant="primary"
              size="default"
              onClick={() => openContentTab('wrapped')}
              className="h-10 gap-2 rounded-full px-4 text-sm font-medium"
            >
              <Sparkles className="size-4" aria-hidden />
              <span className="hidden sm:inline">Create Year Wrap-Up</span>
              <span className="sm:hidden">Wrap-Up</span>
            </Button>
            <Button
              variant="ghost"
              size="default"
              onClick={() => logout()}
              className="h-10 gap-2 px-3 text-muted-foreground hover:text-foreground"
              aria-label="Log out"
            >
              <LogOut className="size-4" />
            </Button>
          </>
        }
      />

      {/* Mobile-only highlights — no favorite artist/venue */}
      <div className="flex flex-col gap-3 lg:hidden">
        {activityStats.concertsThisYear > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" aria-hidden />
              Concerts this year
            </div>
            <span className="text-lg font-bold tabular-nums">{activityStats.concertsThisYear}</span>
          </div>
        )}
        {activityStats.avgRating != null && (
          <button
            type="button"
            onClick={() => openContentTab('reviews')}
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="size-4 text-primary" aria-hidden />
              Average rating
            </div>
            <span className="text-lg font-bold tabular-nums">{activityStats.avgRatingDisplay}</span>
          </button>
        )}
      </div>

      {socialPanel === 'followers' && (
        <section className="space-y-3">
          {followers.length === 0 ? (
            <EmptyState
              title="No followers yet"
              description="Share your username so friends can find and follow you."
            />
          ) : (
            <ul className="space-y-2">
              {followers.map((f) => (
                <li key={f.followerUserId}>
                  <MemberCard
                    currentUserId={user.id}
                    userId={f.followerUserId}
                    username={f.followerUsername}
                    displayName={f.followerDisplayName}
                    avatarUrl={f.followerAvatarUrl}
                    initialFollowing={followingIds.has(f.followerUserId)}
                    onFollowChange={() => void refreshSocial()}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {socialPanel === 'following' && (
        <section className="space-y-3">
          {followingList.length === 0 ? (
            <EmptyState
              title="Not following anyone yet"
              description="Search members to find friends to follow."
              action={
                <Link to="/search?mode=members" className="text-sm font-medium text-primary">
                  Find members →
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {followingList.map((f) => (
                <li key={f.targetUserId}>
                  <MemberCard
                    currentUserId={user.id}
                    userId={f.targetUserId}
                    username={f.targetUsername}
                    displayName={f.targetDisplayName}
                    avatarUrl={f.targetAvatarUrl}
                    initialFollowing
                    onFollowChange={() => void refreshSocial()}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!socialPanel && (
        <div className="lg:grid lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-8 lg:items-start">
          <ProfileDesktopAside
            stats={activityStats}
            userConcerts={userConcerts}
            concertMap={concertMap}
            reviews={reviews}
            onOpenWrapTab={() => openContentTab('wrapped')}
            onOpenReviewsTab={() => openContentTab('reviews')}
          />
          <ProfileContentTabs
            userId={user.id}
            backTo="/profile"
            tab={contentTab}
            onTabChange={selectContentTab}
            userConcerts={userConcerts}
            concertMap={concertMap}
            reviews={reviews}
          />
        </div>
      )}

      <UsernameEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        userId={user.id}
        currentUsername={profile?.username || user.username}
        currentDisplayName={profile?.displayName ?? user.displayName}
        currentBio={profile?.bio ?? user.bio}
        onSaved={(p) => {
          setProfile(p);
          void refreshSocial();
        }}
      />
    </div>
  );
}
