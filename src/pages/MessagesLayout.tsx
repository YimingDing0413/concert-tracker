import { MessageThreadList } from '@/components/messages/MessageThreadList';
import { MessagesProvider, useMessages } from '@/context/MessagesContext';
import { useAuth } from '@/context/AuthContext';
import { decodeThreadIdParam } from '@/lib/social/messagesApi';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

function MessagesInbox() {
  const { user } = useAuth();
  const { threads, loading, error } = useMessages();
  const location = useLocation();

  const activeThreadId = (() => {
    const prefix = '/messages/';
    if (!location.pathname.startsWith(prefix)) return null;
    const raw = location.pathname.slice(prefix.length);
    if (!raw) return null;
    return decodeThreadIdParam(raw);
  })();

  if (!user) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 py-4">
        <h1 className="font-display text-display-md text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">@{user.username || user.displayName || 'you'}</p>
      </div>

      {error && (
        <p className="mx-4 mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <MessageThreadList
          threads={threads}
          currentUserId={user.id}
          activeThreadId={activeThreadId}
          loading={loading}
        />
      </div>
    </div>
  );
}

function MessagesChatPlaceholder() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-3 px-8 text-center md:flex">
      <span className="flex size-16 items-center justify-center rounded-full border border-border/50 bg-card/50">
        <MessageSquare className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <p className="text-lg font-semibold">Your messages</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Select a conversation or message someone from the feed or their profile.
      </p>
    </div>
  );
}

function MessagesLayoutInner() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const isChatOpen = /^\/messages\/.+/.test(location.pathname);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className={cn(
        'flex min-h-0 w-full bg-background',
        isChatOpen
          ? 'h-[100dvh] md:h-[calc(100dvh-4rem)]'
          : 'h-[calc(100dvh-4.25rem)] md:h-[calc(100dvh-4rem)]'
      )}
    >
      <aside
        className={cn(
          'flex min-h-0 w-full flex-col border-border/50 md:w-[340px] md:shrink-0 md:border-r',
          isChatOpen && 'hidden md:flex'
        )}
      >
        <MessagesInbox />
      </aside>

      <section
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          !isChatOpen && 'hidden md:flex'
        )}
      >
        <Outlet />
      </section>
    </div>
  );
}

export function MessagesLayout() {
  return (
    <MessagesProvider>
      <MessagesLayoutInner />
    </MessagesProvider>
  );
}

export { MessagesChatPlaceholder };
