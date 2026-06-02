import { api } from '@/api';
import { MemberCard } from '@/components/social/MemberCard';
import { UsernameEditor } from '@/components/social/UsernameEditor';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import {
  ensureMyProfile,
  getFollowCounts,
  getFollowers,
  getFollowing,
} from '@/lib/social/socialApi';
import type { FollowCounts, FollowerItem, FollowItem, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { LogOut, Pencil } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type SocialPanel = 'followers' | 'following' | null;

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [concertCount, setConcertCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followersCount: 0,
    followingCount: 0,
  });
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [followingList, setFollowingList] = useState<FollowItem[]>([]);
  const [socialPanel, setSocialPanel] = useState<SocialPanel>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const refreshSocial = useCallback(async () => {
    if (!user) return;
    const [prof, counts, fwers, fwing] = await Promise.all([
      ensureMyProfile(user),
      getFollowCounts(user.id).catch(() => ({ followersCount: 0, followingCount: 0 })),
      getFollowers(user.id).catch(() => []),
      getFollowing(user.id).catch(() => []),
    ]);
    setProfile(prof);
    setFollowCounts(counts);
    setFollowers(fwers);
    setFollowingList(fwing);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([api.getUserConcerts(user.id), refreshSocial()])
      .then(([ucs]) => setConcertCount(ucs.length))
      .finally(() => setLoading(false));
  }, [user, refreshSocial]);

  const followingIds = useMemo(
    () => new Set(followingList.map((f) => f.targetUserId)),
    [followingList]
  );

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
    <div className="space-y-6 pb-4">
      <div className="flex flex-col items-center rounded-3xl border border-border/60 bg-card/50 p-6 text-center shadow-lg md:flex-row md:items-start md:text-left">
        <Avatar className="size-20 border-2 border-primary/30 md:mr-5">
          <AvatarImage src={profile?.avatarUrl ?? user.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/20 text-2xl text-primary">
            {(profile?.displayName || user.displayName).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="mt-4 min-w-0 flex-1 md:mt-0">
          <h1 className="text-2xl font-bold">{profile?.displayName || user.displayName}</h1>
          <p className="text-muted-foreground">
            {profile?.username || user.username
              ? `@${profile?.username || user.username}`
              : 'No username yet'}
          </p>
          {(profile?.bio ?? user.bio) && (
            <p className="mt-2 text-sm text-foreground/90">{profile?.bio ?? user.bio}</p>
          )}

          <div className="mt-4 flex items-center justify-center gap-8 md:justify-start">
            <Link
              to="/my-concerts"
              className="flex flex-col items-center text-center no-underline transition-opacity hover:opacity-80 md:items-start md:text-left"
            >
              <span className="text-lg font-bold text-foreground">{concertCount}</span>
              <span className="text-xs text-muted-foreground">Concerts</span>
            </Link>
            <button
              type="button"
              onClick={() => toggleSocialPanel('followers')}
              className={cn(
                'flex flex-col items-center text-center transition-opacity hover:opacity-80 md:items-start md:text-left',
                socialPanel === 'followers' && 'opacity-100'
              )}
            >
              <span className="text-lg font-bold text-foreground">{followCounts.followersCount}</span>
              <span className="text-xs text-muted-foreground">Followers</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSocialPanel('following')}
              className={cn(
                'flex flex-col items-center text-center transition-opacity hover:opacity-80 md:items-start md:text-left',
                socialPanel === 'following' && 'opacity-100'
              )}
            >
              <span className="text-lg font-bold text-foreground">{followCounts.followingCount}</span>
              <span className="text-xs text-muted-foreground">Following</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
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
