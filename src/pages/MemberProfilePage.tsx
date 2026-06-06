import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/components/profile/ProfileContentTabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabBar } from '@/components/profile/ProfileTabBar';
import { MemberCard } from '@/components/social/MemberCard';
import { FollowButton } from '@/components/social/FollowButton';
import { openDmThread } from '@/lib/social/messagesApi';
import { Button } from '@/components/ui/app-button';
import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import { useProfileConcerts } from '@/hooks/useProfileConcerts';
import {
  getFollowCounts,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getMyProfile,
} from '@/lib/social/socialApi';
import type { FollowCounts, FollowerItem, FollowItem, UserProfile } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

type SocialPanel = 'followers' | 'following' | null;

export function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openingMessage, setOpeningMessage] = useState(false);
  const currentUserId = user?.id ?? '';
  const isSelf = Boolean(userId && currentUserId && userId === currentUserId);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followersCount: 0, followingCount: 0 });
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [followingList, setFollowingList] = useState<FollowItem[]>([]);
  const [socialPanel, setSocialPanel] = useState<SocialPanel>(null);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('concerts');
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());
  const [socialLoading, setSocialLoading] = useState(true);

  const { userConcerts, concertMap, loading: concertsLoading } = useProfileConcerts(userId);

  const refreshSocial = useCallback(async () => {
    if (!userId) return;
    const [p, c, fwers, fwing, fStatus, myFollowing] = await Promise.all([
      getMyProfile(userId),
      getFollowCounts(userId),
      getFollowers(userId).catch(() => []),
      getFollowing(userId).catch(() => []),
      currentUserId && !isSelf
        ? getFollowStatus(currentUserId, userId)
        : Promise.resolve(false),
      currentUserId
        ? getFollowing(currentUserId).catch(() => [])
        : Promise.resolve([]),
    ]);
    setProfile(p);
    setFollowCounts(c);
    setFollowers(fwers);
    setFollowingList(fwing);
    setFollowing(fStatus);
    setMyFollowingIds(new Set(myFollowing.map((f) => f.targetUserId)));
    setSocialLoading(false);
  }, [userId, currentUserId, isSelf]);

  useEffect(() => {
    if (!userId) return;
    setSocialLoading(true);
    void refreshSocial();
  }, [userId, refreshSocial]);

  const backTo = userId ? `/member/${encodeURIComponent(userId)}` : '/search?mode=members';
  const loading = socialLoading || concertsLoading;

  if (isSelf) return <Navigate to="/profile" replace />;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading profile…" />
      </div>
    );
  }

  if (!profile || !userId) {
    return (
      <div className="space-y-4">
        <SolidBackButton to="/search?mode=members" label="Back" />
        <EmptyState title="Member not found" description="This profile doesn't exist or was removed." />
      </div>
    );
  }

  const displayName =
    profile.displayName?.trim() || (profile.username ? `@${profile.username}` : 'Member');

  async function handleMessage() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!userId) return;
    setOpeningMessage(true);
    try {
      const thread = await openDmThread({
        targetUserId: userId,
        context: { contextType: 'general' },
      });
      navigate(`/messages/${thread.id}`);
    } catch {
      /* ignore — user may need to log in again for token */
    } finally {
      setOpeningMessage(false);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <SolidBackButton to="/search?mode=members" label="Back" />

      <ProfileHeader
        displayName={displayName}
        username={profile.username}
        bio={profile.bio}
        avatarUrl={profile.avatarUrl}
        followCounts={followCounts}
        socialPanel={socialPanel}
        onToggleFollowers={() => setSocialPanel((p) => (p === 'followers' ? null : 'followers'))}
        onToggleFollowing={() => setSocialPanel((p) => (p === 'following' ? null : 'following'))}
        trailingActions={
          !isSelf ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="default"
                className="h-10 gap-2 rounded-full px-5"
                disabled={openingMessage}
                onClick={() => void handleMessage()}
              >
                <MessageCircle className="size-4" aria-hidden />
                Message
              </Button>
              <FollowButton
                currentUserId={currentUserId}
                targetUserId={profile.userId}
                initialFollowing={following}
                showSelfLabel
                size="default"
                onChange={(isFollowing, c) => {
                  setFollowing(isFollowing);
                  if (c) setFollowCounts(c);
                }}
              />
            </div>
          ) : undefined
        }
      />

      {socialPanel === 'followers' && (
        <section className="space-y-3">
          {followers.length === 0 ? (
            <EmptyState title="No followers yet" />
          ) : (
            <ul className="space-y-2">
              {followers.map((f) => (
                <li key={f.followerUserId}>
                  <MemberCard
                    currentUserId={currentUserId}
                    userId={f.followerUserId}
                    username={f.followerUsername}
                    displayName={f.followerDisplayName}
                    avatarUrl={f.followerAvatarUrl}
                    initialFollowing={myFollowingIds.has(f.followerUserId)}
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
            <EmptyState title="Not following anyone" />
          ) : (
            <ul className="space-y-2">
              {followingList.map((f) => (
                <li key={f.targetUserId}>
                  <MemberCard
                    currentUserId={currentUserId}
                    userId={f.targetUserId}
                    username={f.targetUsername}
                    displayName={f.targetDisplayName}
                    avatarUrl={f.targetAvatarUrl}
                    initialFollowing={myFollowingIds.has(f.targetUserId)}
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
            onTabChange={(tab) => {
              setSocialPanel(null);
              setContentTab(tab);
            }}
            concertCount={userConcerts.filter((uc) => uc.status === 'attended').length}
            goingCount={userConcerts.filter((uc) => uc.status === 'going').length}
            mode="concerts-only"
          />
          <ProfileContentTabs
            userId={userId}
            backTo={backTo}
            tab={contentTab}
            userConcerts={userConcerts}
            concertMap={concertMap}
            reviews={[]}
            mode="concerts-only"
          />
        </>
      )}
    </div>
  );
}
