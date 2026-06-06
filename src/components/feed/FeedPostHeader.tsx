import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { FeedPost } from '@/types';
import { formatRelativeTime } from '@/utils/format';

interface FeedPostHeaderProps {
  post: FeedPost;
}

export function FeedPostHeader({ post }: FeedPostHeaderProps) {
  const name = post.userDisplayName || post.username || 'Member';
  const initial = name.replace('@', '').slice(0, 1).toUpperCase();
  const timeAgo = post.createdAt ? formatRelativeTime(post.createdAt) : '';

  return (
    <header className="flex items-center gap-3">
      <Avatar className="size-10 border border-border/50">
        <AvatarImage src={post.avatarUrl} alt="" />
        <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        {post.username && (
          <p className="truncate text-xs text-muted-foreground">@{post.username}</p>
        )}
      </div>
      {timeAgo && <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>}
    </header>
  );
}
