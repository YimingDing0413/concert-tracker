import { MemberCard } from '@/components/social/MemberCard';
import { UsernameEditor } from '@/components/social/UsernameEditor';
import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/components/profile/ProfileContentTabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabBar } from '@/components/profile/ProfileTabBar';
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
import { getUserFeed } from '@/lib/social/feedApi';
import {
  ensureMyProfile,
  getFollowCounts,
  getFollowers,
  getFollowing,
} from '@/lib/social/socialApi';
import { SpotifyConnectionsSection } from '@/components/spotify/SpotifyConnectionsSection';
import {
  disconnectSpotify,
  getSpotifyStatus,
  startSpotifyConnect,
  syncSpotifyTaste,
} from '@/lib/social/spotifyApi';
import { spotifyConnectErrorMessage } from '@/lib/spotifyConnectErrors';
import type { FeedPost, FollowCounts, FollowerItem, FollowItem, UserProfile } from '@/types';
import type { SpotifyConnectionStatus } from '@/types/spotify';
import type { ConcertReview } from '@/types/concertReview';
import { LogOut, Pencil, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function parseProfileTab(value: string | null): ProfileContentTab {
  if (
    value === 'going' ||
    value === 'want' ||
    value === 'reviews' ||
    value === 'posts' ||
    value === 'wrapped' ||
    value === 'concerts'
  ) {
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
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [socialPanel, setSocialPanel] = useState<SocialPanel>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [contentTab, setContentTab] = useState<ProfileContentTab>(() =>
    parseProfileTab(searchParams.get('tab'))
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [socialLoading, setSocialLoading] = useState(true);
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyConnectionStatus | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState(true);
  const [spotifySyncing, setSpotifySyncing] = useState(false);
  const [spotifyDisconnecting, setSpotifyDisconnecting] = useState(false);
  const [spotifyConnectError, setSpotifyConnectError] = useState<string | null>(null);

  const { userConcerts, concertMap, loading: concertsLoading } = useProfileConcerts(user?.id);

  const refreshSocial = useCallback(async () => {
    if (!user) return;
    const [prof, counts, fwers, fwing, syncedReviews, posts] = await Promise.all([
      ensureMyProfile(user),
      getFollowCounts(user.id).catch(() => ({ followersCount: 0, followingCount: 0 })),
      getFollowers(user.id).catch(() => []),
      getFollowing(user.id).catch(() => []),
      syncConcertReviewsFromServer(user.id),
      getUserFeed(user.id).catch(() => []),
    ]);
    setProfile(prof);
    setFollowCounts(counts);
    setFollowers(fwers);
    setFollowingList(fwing);
    setReviews(syncedReviews);
    setFeedPosts(posts);
    setSocialLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setSocialLoading(true);
    void refreshSocial();
  }, [user, refreshSocial]);

  const refreshSpotify = useCallback(async () => {
    if (!user) return;
    setSpotifyLoading(true);
    try {
      const status = await getSpotifyStatus();
      setSpotifyStatus(status);
    } catch {
      setSpotifyStatus({ connected: false, hasTasteProfile: false });
    } finally {
      setSpotifyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshSpotify();
  }, [refreshSpotify]);

  useEffect(() => {
    const spotify = searchParams.get('spotify');
    const reason = searchParams.get('reason');

    if (spotify === 'error' && reason) {
      setSpotifyConnectError(spotifyConnectErrorMessage(reason));
      setSearchParams({}, { replace: true });
      return;
    }

    if (spotify === 'connected' && user) {
      setSpotifyConnectError(null);
      void refreshSpotify();
      void syncSpotifyTaste()
        .then(() => refreshSpotify())
        .catch((err) => {
          setSpotifyConnectError(
            err instanceof Error ? err.message : 'Spotify connected but sync failed.'
          );
        });
    }
  }, [searchParams, user, refreshSpotify, setSearchParams]);

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

  const attendedCount = useMemo(
    () => userConcerts.filter((uc) => uc.status === 'attended').length,
    [userConcerts]
  );
  const goingCount = useMemo(
    () => userConcerts.filter((uc) => uc.status === 'going').length,
    [userConcerts]
  );
  const wantCount = useMemo(
    () => userConcerts.filter((uc) => uc.status === 'saved').length,
    [userConcerts]
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

  function toggleSocialPanel(panel: SocialPanel) {
    setSocialPanel((current) => (current === panel ? null : panel));
  }

  return (
    <div className="space-y-8 pb-8">
      <ProfileHeader
        displayName={profile?.displayName || user.displayName}
        username={profile?.username || user.username}
        bio={profile?.bio ?? user.bio}
        avatarUrl={profile?.avatarUrl ?? user.avatarUrl}
        followCounts={followCounts}
        socialPanel={socialPanel}
        onToggleFollowers={() => toggleSocialPanel('followers')}
        onToggleFollowing={() => toggleSocialPanel('following')}
        trailingActions={
          <>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setEditorOpen(true)}
              className="h-10 gap-2 rounded-full px-5 text-sm font-medium"
            >
              <Pencil className="size-4" aria-hidden />
              {profile?.username ? 'Edit profile' : 'Set username'}
            </Button>
            <Button
              variant="primary"
              size="default"
              onClick={() => selectContentTab('wrapped')}
              className="h-10 gap-2 rounded-full px-5 text-sm font-medium"
            >
              <Sparkles className="size-4" aria-hidden />
              Create Year Wrap-Up
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

      <SpotifyConnectionsSection
        status={spotifyStatus}
        loading={spotifyLoading}
        syncing={spotifySyncing}
        disconnecting={spotifyDisconnecting}
        error={spotifyConnectError}
        onConnect={async () => {
          setSpotifyConnectError(null);
          try {
            await startSpotifyConnect();
          } catch (err) {
            setSpotifyConnectError(
              err instanceof Error ? err.message : 'Could not connect Spotify.'
            );
          }
        }}
        onSync={async () => {
          setSpotifySyncing(true);
          try {
            await syncSpotifyTaste();
            await refreshSpotify();
          } finally {
            setSpotifySyncing(false);
          }
        }}
        onDisconnect={async () => {
          setSpotifyDisconnecting(true);
          try {
            await disconnectSpotify();
            await refreshSpotify();
          } finally {
            setSpotifyDisconnecting(false);
          }
        }}
      />

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
        <>
          <ProfileTabBar
            tab={contentTab}
            onTabChange={selectContentTab}
            concertCount={attendedCount}
            goingCount={goingCount}
            wantCount={wantCount}
            reviewCount={reviews.length}
            postCount={feedPosts.length}
          />

          <ProfileContentTabs
            userId={user.id}
            backTo="/profile"
            tab={contentTab}
            userConcerts={userConcerts}
            concertMap={concertMap}
            reviews={reviews}
            feedPosts={feedPosts}
          />
        </>
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
