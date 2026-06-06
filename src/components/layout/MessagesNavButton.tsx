import { cn } from '@/lib/utils';
import { getUnreadMessageCount } from '@/lib/social/messagesApi';
import { useAuth } from '@/context/AuthContext';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MessagesNavButtonProps {
  className?: string;
}

export function MessagesNavButton({ className }: MessagesNavButtonProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    void getUnreadMessageCount()
      .then(setUnread)
      .catch(() => setUnread(0));
  }, [user, pathname]);

  if (!user) return null;

  return (
    <Link
      to="/messages"
      className={cn(
        'relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
        pathname.startsWith('/messages') && 'bg-primary/15 text-primary',
        className
      )}
      aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
    >
      <MessageCircle className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" aria-hidden />
      )}
    </Link>
  );
}
