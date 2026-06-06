import { EmptyFeedState } from '@/components/feed/EmptyFeedState';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { StartMessageModal } from '@/components/messages/StartMessageModal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import { getFeed } from '@/lib/social/feedApi';
import { buildTicketPrefill } from '@/lib/social/messagesApi';
import type { FeedFilter, FeedPost } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function parseFilter(value: string | null): FeedFilter {
  if (
    value === 'following' ||
    value === 'looking_for_tickets' ||
    value === 'reviews' ||
    value === 'all'
  ) {
    return value;
  }
  return 'all';
}

export function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<FeedFilter>(() => parseFilter(searchParams.get('filter')));
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagePost, setMessagePost] = useState<FeedPost | null>(null);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await getFeed(filter);
      setPosts(data);
    } catch {
      setPosts([]);
      setError('Could not load feed. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get('filter')));
  }, [searchParams]);

  function selectFilter(next: FeedFilter) {
    setFilter(next);
    if (next === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ filter: next }, { replace: true });
    }
  }

  function handleHaveTickets(post: FeedPost) {
    if (!user) {
      navigate('/login');
      return;
    }
    if (post.userId === user.id) return;
    setMessagePost(post);
  }

  if (!user) return null;

  const targetLabel = messagePost?.username
    ? `@${messagePost.username}`
    : messagePost?.userDisplayName;

  return (
    <div className="space-y-6 pb-4">
      <SectionHeader title="Feed" subtitle="See what the community is sharing" />

      <FeedFilterTabs filter={filter} onFilterChange={selectFilter} showFollowing />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <ListRowSkeleton count={3} />
      ) : posts.length === 0 ? (
        <EmptyFeedState filter={filter} />
      ) : (
        <ul className="space-y-5">
          {posts.map((post) => (
            <li key={post.id}>
              <FeedPostCard
                post={post}
                viewerUserId={user.id}
                onHaveTickets={() => handleHaveTickets(post)}
              />
            </li>
          ))}
        </ul>
      )}

      {messagePost && (
        <StartMessageModal
          open={Boolean(messagePost)}
          onOpenChange={(open) => {
            if (!open) setMessagePost(null);
          }}
          targetUserId={messagePost.userId}
          targetLabel={targetLabel}
          prefilledText={buildTicketPrefill({
            artistName: messagePost.artistName,
            venueName: messagePost.venueName,
            eventDate: messagePost.eventDate,
          })}
          feedPost={messagePost}
        />
      )}
    </div>
  );
}
