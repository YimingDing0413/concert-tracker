import { MemberCard } from '@/components/social/MemberCard';
import { UsernameEditor } from '@/components/social/UsernameEditor';
import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/components/profile/ProfileContentTabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import { ProfileTabBar } from '@/components/profile/ProfileTabBar';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { FEATURES } from '@/config/features';
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
import { resolveConcertForUserConcert } from '@/utils/userConcert';
import { Settings, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function parseProfileTab(value: string | null): ProfileContentTab {
  if (value === 'posts') return 'concerts';
  if (value === 'reviews') return 'concerts';
  if (value === 'going' || value === 'want' || value === 'wrapped' || value === 'concerts') {
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      FEATURES.social
        ? getFollowCounts(user.id).catch(() => ({ followersCount: 0, followingCount: 0 }))
        : Promise.resolve({ followersCount: 0, followingCount: 0 }),
      FEATURES.social ? getFollowers(user.id).catch(() => []) : Promise.resolve([]),
      FEATURES.social ? getFollowing(user.id).catch(() => []) : Promise.resolve([]),
      syncConcertReviewsFromServer(user.id),
      FEATURES.social ? getUserFeed(user.id).catch(() => []) : Promise.resolve([]),
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
    if (!user || !FEATURES.spotify) return;
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
      setSettingsOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }

    if (spotify === 'connected' && user) {
      setSpotifyConnectError(null);
      setSettingsOpen(true);
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

  const attended = useMemo(
    () => userConcerts.filter((uc) => uc.status === 'attended'),
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

  const { uniqueArtists, uniqueVenues } = useMemo(() => {
    const artists = new Set<string>();
    const venues = new Set<string>();
    for (const uc of attended) {
      const c = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
      if (c.artistName) artists.add(c.artistName.toLowerCase());
      if (c.venueName) venues.add(c.venueName.toLowerCase());
    }
    return { uniqueArtists: artists.size, uniqueVenues: venues.size };
  }, [attended, concertMap]);

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
    <div className="space-y-7 pb-8">
      <ProfileHeader
        displayName={profile?.displayName || user.displayName}
        username={profile?.username || user.username}
        bio={profile?.bio ?? user.bio}
        avatarUrl={profile?.avatarUrl ?? user.avatarUrl}
        shows={attended.length}
        artists={uniqueArtists}
        venues={uniqueVenues}
        followCounts={followCounts}
        socialPanel={socialPanel}
        onToggleFollowers={() => toggleSocialPanel('followers')}
        onToggleFollowing={() => toggleSocialPanel('following')}
        trailingActions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              render={<Link to="/wrapped" />}
              className="text-muted-foreground hover:text-foreground"
              aria-label="View Wrapped"
            >
              <Sparkles className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Button>
          </div>
        }
      />

      {FEATURES.social && socialPanel === 'followers' && (
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

      {FEATURES.social && socialPanel === 'following' && (
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
            concertCount={attended.length}
            goingCount={goingCount}
            wantCount={wantCount}
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

      <ProfileSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onEditProfile={() => setEditorOpen(true)}
        onLogout={() => logout()}
        spotifyStatus={spotifyStatus}
        spotifyLoading={spotifyLoading}
        spotifySyncing={spotifySyncing}
        spotifyDisconnecting={spotifyDisconnecting}
        spotifyConnectError={spotifyConnectError}
        onSpotifyConnect={async () => {
          setSpotifyConnectError(null);
          try {
            await startSpotifyConnect();
          } catch (err) {
            setSpotifyConnectError(
              err instanceof Error ? err.message : 'Could not connect Spotify.'
            );
          }
        }}
        onSpotifySync={async () => {
          setSpotifySyncing(true);
          try {
            await syncSpotifyTaste();
            await refreshSpotify();
          } finally {
            setSpotifySyncing(false);
          }
        }}
        onSpotifyDisconnect={async () => {
          setSpotifyDisconnecting(true);
          try {
            await disconnectSpotify();
            await refreshSpotify();
          } finally {
            setSpotifyDisconnecting(false);
          }
        }}
      />

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
