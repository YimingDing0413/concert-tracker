import { ConcertCard } from '@/components/concert/ConcertCard';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { StartMessageModal } from '@/components/messages/StartMessageModal';
import { ProfileReviewListItem } from '@/components/review/ProfileReviewListItem';
import { YearEndWrapUp } from '@/components/wrap-up/year-end/YearEndWrapUp';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getConcertReview } from '@/lib/concertReviewsLocal';
import type { Concert, FeedPost, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { averageOverallRating, formatOverallRating } from '@/utils/format';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { Sparkles, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { buildTicketPrefill } from '@/lib/social/messagesApi';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export type ProfileContentTab = 'concerts' | 'going' | 'reviews' | 'posts' | 'wrapped';

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
  const attendedSorted = sortUserConcertsByDate(attended, concertMap);
  const goingSorted = sortUserConcertsByDate(going, concertMap);

  const avg = averageOverallRating(reviews.map((r) => r.overallRating));

  return (
    <section className="space-y-6">
      {tab === 'concerts' && (
        <TabBody
          emptyTitle="No concerts yet"
          emptyDescription="Shows you've been to appear here after you mark them attended."
          emptyAction={
            <Link to="/" className="text-sm font-medium text-primary">
              Discover concerts →
            </Link>
          }
          isEmpty={attendedSorted.length === 0}
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {attendedSorted.map((uc) => {
              const hasReview = mode === 'full' && Boolean(getConcertReview(userId, uc.concertId));
              const reviewState = {
                backTo,
                concertSnapshot: concertMap[uc.concertId],
              };
              const stop = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
              };
              const rateAction =
                mode === 'full' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={hasReview ? 'secondary' : 'primary'}
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        stop(e);
                        navigate(`/concert/${uc.concertId}/review`, { state: reviewState });
                      }}
                    >
                      <Star className="size-4" aria-hidden />
                      {hasReview ? 'Edit rating' : 'Rate'}
                    </Button>
                    {hasReview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          stop(e);
                          navigate(`/concert/${uc.concertId}/wrap-up`, { state: reviewState });
                        }}
                      >
                        <Sparkles className="size-4" aria-hidden />
                        Wrap-up
                      </Button>
                    )}
                  </div>
                ) : undefined;
              return (
                <li key={uc.id}>
                  <ConcertCard
                    concert={resolveConcertForUserConcert(uc, concertMap[uc.concertId])}
                    userConcert={uc}
                    concertId={uc.concertId}
                    backTo={backTo}
                    variant="memory"
                    showSource={false}
                    footer={rateAction}
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
            <Link to="/" className="text-sm font-medium text-primary">
              Find shows →
            </Link>
          }
          isEmpty={goingSorted.length === 0}
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {goingSorted.map((uc) => (
              <li key={uc.id}>
                <ConcertCard
                  concert={resolveConcertForUserConcert(uc, concertMap[uc.concertId])}
                  userConcert={uc}
                  concertId={uc.concertId}
                  backTo={backTo}
                  variant="memory"
                  showSource={false}
                />
              </li>
            ))}
          </ul>
        </TabBody>
      )}

      {mode === 'full' && tab === 'reviews' && (
        <TabBody
          emptyTitle="No reviews yet"
          emptyDescription="Rate a concert from your Concerts tab."
          emptyAction={
            <Link to="/profile" className="text-sm font-medium text-primary">
              View concerts →
            </Link>
          }
          isEmpty={reviews.length === 0}
        >
          {avg != null && (
            <p className="text-sm text-muted-foreground">
              Average: <span className="font-semibold text-foreground">{formatOverallRating(avg)}</span>
            </p>
          )}
          <ul className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <li key={review.id}>
                <ProfileReviewListItem review={review} />
              </li>
            ))}
          </ul>
        </TabBody>
      )}

      {mode === 'full' && tab === 'posts' && (
        <TabBody
          emptyTitle="No posts yet"
          emptyDescription="Share a concert memory, review, or ticket request from Create."
          emptyAction={
            <Link to="/create" className="text-sm font-medium text-primary">
              Create a post →
            </Link>
          }
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
          {messagePost && (
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

      {mode === 'full' && tab === 'wrapped' && <YearEndWrapUp userId={userId} />}
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
