import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { FollowButton } from '@/components/social/FollowButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import {
  getFollowCounts,
  getFollowStatus,
  getMyProfile,
} from '@/lib/social/socialApi';
import type { FollowCounts, UserProfile } from '@/types';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [counts, setCounts] = useState<FollowCounts>({ followersCount: 0, followingCount: 0 });
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      getMyProfile(userId),
      getFollowCounts(userId),
      currentUserId ? getFollowStatus(currentUserId, userId) : Promise.resolve(false),
    ])
      .then(([p, c, f]) => {
        if (!active) return;
        setProfile(p);
        setCounts(c);
        setFollowing(f);
      })
      .catch(() => {
        /* leave defaults */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, currentUserId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading profile…" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <SolidBackButton to="/search?mode=members" label="Back" />
        <EmptyState title="Member not found" description="This profile doesn't exist or was removed." />
      </div>
    );
  }

  const name = profile.displayName?.trim() || (profile.username ? `@${profile.username}` : 'Member');

  return (
    <div className="space-y-6 pb-4">
      <SolidBackButton to="/search?mode=members" label="Back" />

      <div className="flex flex-col items-center rounded-3xl border border-border/60 bg-card/50 p-6 text-center shadow-lg">
        <Avatar className="size-24 border-2 border-primary/30">
          <AvatarImage src={profile.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/20 text-3xl text-primary">
            {name.replace('@', '').slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h1 className="mt-4 text-2xl font-bold">{name}</h1>
        {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
        {profile.bio && <p className="mt-2 max-w-sm text-sm text-foreground/90">{profile.bio}</p>}

        <div className="mt-4 flex items-center gap-6">
          <div className="text-center">
            <p className="text-lg font-bold">{counts.followersCount}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{counts.followingCount}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        <div className="mt-5">
          <FollowButton
            currentUserId={currentUserId}
            targetUserId={profile.userId}
            initialFollowing={following}
            showSelfLabel
            size="default"
            onChange={(isFollowing, c) => {
              setFollowing(isFollowing);
              if (c) setCounts(c);
            }}
          />
        </div>
      </div>

      <EmptyState
        title="Concerts & reviews coming soon"
        description="Public reviews and concert history will show up here."
      />
    </div>
  );
}
