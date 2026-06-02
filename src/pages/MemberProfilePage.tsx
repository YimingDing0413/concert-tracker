import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/components/profile/ProfileContentTabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { MemberCard } from '@/components/social/MemberCard';
import { FollowButton } from '@/components/social/FollowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import { useProfileConcerts } from '@/hooks/useProfileConcerts';
import { buildProfileActivityStats } from '@/lib/profileStats';
import {
  getFollowCounts,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getMyProfile,
} from '@/lib/social/socialApi';
import type { FollowCounts, FollowerItem, FollowItem, UserProfile } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

type SocialPanel = 'followers' | 'following' | null;

export function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
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

  const activityStats = useMemo(
    () => buildProfileActivityStats(userConcerts, concertMap, []),
    [userConcerts, concertMap]
  );

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

  function openContentTab(tab: ProfileContentTab) {
    setSocialPanel(null);
    setContentTab(tab);
  }

  return (
    <div className="space-y-5 pb-4">
      <SolidBackButton to="/search?mode=members" label="Back" />

      <ProfileHeader
        displayName={displayName}
        username={profile.username}
        bio={profile.bio}
        avatarUrl={profile.avatarUrl}
        stats={activityStats}
        followCounts={followCounts}
        socialPanel={socialPanel}
        onToggleFollowers={() => setSocialPanel((p) => (p === 'followers' ? null : 'followers'))}
        onToggleFollowing={() => setSocialPanel((p) => (p === 'following' ? null : 'following'))}
        onConcertsClick={() => openContentTab('concerts')}
        showReviewStats={false}
        trailingActions={
          !isSelf ? (
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
        <ProfileContentTabs
          userId={userId}
          backTo={backTo}
          tab={contentTab}
          onTabChange={setContentTab}
          userConcerts={userConcerts}
          concertMap={concertMap}
          reviews={[]}
          mode="concerts-only"
        />
      )}
    </div>
  );
}
