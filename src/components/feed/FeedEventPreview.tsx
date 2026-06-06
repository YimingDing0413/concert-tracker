import type { FeedPost } from '@/types';
import { formatDate } from '@/utils/format';
import { Calendar, MapPin, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeedEventPreviewProps {
  post: FeedPost;
}

export function FeedEventPreview({ post }: FeedEventPreviewProps) {
  if (!post.artistName && !post.eventId) return null;

  const inner = (
    <div className="flex gap-3 rounded-xl border border-border/40 bg-card/40 p-3">
      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt=""
          className="size-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/50 to-fuchsia-900/40">
          <Music2 className="size-6 text-white/80" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{post.artistName ?? 'Concert'}</p>
        {post.venueName && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {post.venueName}
            {post.city ? ` · ${post.city}` : ''}
          </p>
        )}
        {post.eventDate && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" aria-hidden />
            {formatDate(post.eventDate)}
          </p>
        )}
      </div>
    </div>
  );

  if (post.eventId) {
    return (
      <Link to={`/concert/${post.eventId}`} className="block no-underline">
        {inner}
      </Link>
    );
  }

  return inner;
}
