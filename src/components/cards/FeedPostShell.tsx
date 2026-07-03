import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { FeedPost } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import type { ReactNode } from 'react';

interface FeedPostShellProps {
  post: FeedPost;
  sentence: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function FeedPostShell({ post, sentence, children, actions }: FeedPostShellProps) {
  const name = post.userDisplayName || post.username || 'Member';
  const initial = name.replace('@', '').slice(0, 1).toUpperCase();
  const timeAgo = post.createdAt ? formatRelativeTime(post.createdAt) : '';

  return (
    <article className="space-y-3 border-b border-[var(--encore-border-subtle)] pb-8 last:border-0 last:pb-0">
      <header className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={post.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/15 font-display text-sm font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-sm leading-snug text-foreground/90">{sentence}</div>
        {timeAgo && (
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
        )}
      </header>
      <div className="pl-[3.25rem] space-y-3">{children}</div>
      {actions && <div className="flex flex-wrap gap-2 pl-[3.25rem] pt-1">{actions}</div>}
    </article>
  );
}
