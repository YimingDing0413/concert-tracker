import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { StartMessageModal } from '@/components/messages/StartMessageModal';
import { ProfileReviewListItem } from '@/components/review/ProfileReviewListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { TicketCard } from '@/components/ui/TicketCard';
import { FEATURES } from '@/config/features';
import { useAuth } from '@/context/AuthContext';
import { getConcertReview } from '@/lib/concertReviewsLocal';
import { buildTicketPrefill } from '@/lib/social/messagesApi';
import type { Concert, FeedPost, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export type ProfileContentTab = 'concerts' | 'going' | 'want' | 'reviews' | 'posts' | 'wrapped';

interface ProfileContentTabsProps {
  userId: string;
  backTo: string;
  tab: ProfileContentTab;
  userConcerts: UserConcert[];
  concertMap: Record<string, Partial<Concert>>;
  reviews: ConcertReview[];
  feedPosts?: FeedPost[];
  /** Public member profiles: concerts + going only */
  mode?: 'full' | 'concerts-only';
}

export function ProfileContentTabs({
  userId,
  backTo,
  tab,
  userConcerts,
  concertMap,
  reviews,
  feedPosts = [],
  mode = 'full',
}: ProfileContentTabsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messagePost, setMessagePost] = useState<FeedPost | null>(null);
  const viewerUserId = user?.id;
  const attended = userConcerts.filter((uc) => uc.status === 'attended');
  const going = userConcerts.filter((uc) => uc.status === 'going');
  const want = userConcerts.filter((uc) => uc.status === 'saved');
  const attendedSorted = sortUserConcertsByDate(attended, concertMap);
  const goingSorted = sortUserConcertsByDate(going, concertMap);
  const wantSorted = sortUserConcertsByDate(want, concertMap);

  function openConcert(concertId: string) {
    navigate(`/concert/${concertId}`, { state: { backTo } });
  }

  return (
    <section className="space-y-6">
      {tab === 'concerts' && (
        <TabBody
          emptyTitle="No shows yet"
          emptyDescription="Shows you've been to appear here after you log them."
          emptyAction={
            <Link to="/log" className="text-sm font-medium text-primary">
              Log a show →
            </Link>
          }
          isEmpty={attendedSorted.length === 0}
        >
          <ul className="space-y-3">
            {attendedSorted.map((uc) => {
              const concert = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
              const review = mode === 'full' ? getConcertReview(userId, uc.concertId) : undefined;
              const rating = review?.overallRating;
              return (
                <li key={uc.id}>
                  <TicketCard
                    artist={concert.artistName || 'Unknown artist'}
                    venue={concert.venueName}
                    city={concert.city}
                    date={concert.date || ''}
                    rating={rating}
                    variant="paper"
                    onClick={() => openConcert(uc.concertId)}
                    footer={
                      review ? (
                        <span className="text-label-mono text-[10px] text-black/50">Reviewed</span>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </TabBody>
      )}

      {tab === 'going' && (
        <TabBody
          emptyTitle="Nothing on the calendar"
          emptyDescription="Mark an upcoming show as going and it will show up here."
          emptyAction={
            <Link to="/discover" className="text-sm font-medium text-primary">
              Find shows →
            </Link>
          }
          isEmpty={goingSorted.length === 0}
        >
          <ul className="space-y-3">
            {goingSorted.map((uc) => {
              const concert = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
              return (
                <li key={uc.id}>
                  <TicketCard
                    artist={concert.artistName || 'Unknown artist'}
                    venue={concert.venueName}
                    city={concert.city}
                    date={concert.date || ''}
                    variant="outline"
                    onClick={() => openConcert(uc.concertId)}
                  />
                </li>
              );
            })}
          </ul>
        </TabBody>
      )}

      {mode === 'full' && tab === 'want' && (
        <TabBody
          emptyTitle="Wishlist is empty"
          emptyDescription="Save concerts you want tickets for — they'll appear here."
          emptyAction={
            <Link to="/discover" className="text-sm font-medium text-primary">
              Discover shows →
            </Link>
          }
          isEmpty={wantSorted.length === 0}
        >
          <ul className="space-y-3">
            {wantSorted.map((uc) => {
              const concert = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
              return (
                <li key={uc.id}>
                  <TicketCard
                    artist={concert.artistName || 'Unknown artist'}
                    venue={concert.venueName}
                    city={concert.city}
                    date={concert.date || ''}
                    variant="outline"
                    onClick={() => openConcert(uc.concertId)}
                  />
                </li>
              );
            })}
          </ul>
        </TabBody>
      )}

      {FEATURES.social && mode === 'full' && tab === 'reviews' && (
        <TabBody
          emptyTitle="No reviews yet"
          emptyDescription="Rate a concert from your Been tab."
          isEmpty={reviews.length === 0}
        >
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ProfileReviewListItem review={review} />
              </li>
            ))}
          </ul>
        </TabBody>
      )}

      {FEATURES.social && mode === 'full' && tab === 'posts' && (
        <TabBody
          emptyTitle="No posts yet"
          emptyDescription="Share a concert memory when social is enabled."
          isEmpty={feedPosts.length === 0}
        >
          <ul className="space-y-5">
            {feedPosts.map((post) => (
              <li key={post.id}>
                <FeedPostCard
                  post={post}
                  viewerUserId={viewerUserId}
                  onHaveTickets={() => {
                    if (
                      FEATURES.messages &&
                      post.type === 'looking_for_tickets' &&
                      viewerUserId &&
                      post.userId !== viewerUserId
                    ) {
                      setMessagePost(post);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
          {FEATURES.messages && messagePost && (
            <StartMessageModal
              open={Boolean(messagePost)}
              onOpenChange={(open) => {
                if (!open) setMessagePost(null);
              }}
              targetUserId={messagePost.userId}
              targetLabel={
                messagePost.username ? `@${messagePost.username}` : messagePost.userDisplayName
              }
              prefilledText={buildTicketPrefill({
                artistName: messagePost.artistName,
                venueName: messagePost.venueName,
                eventDate: messagePost.eventDate,
              })}
              feedPost={messagePost}
            />
          )}
        </TabBody>
      )}
    </section>
  );
}

function TabBody({
  children,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  children: ReactNode;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  return <div className="space-y-4">{children}</div>;
}
