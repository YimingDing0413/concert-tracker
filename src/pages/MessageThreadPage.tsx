import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { MessageContextCard } from '@/components/messages/MessageContextCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import {
  getThreadWithMessages,
  otherParticipant,
  sendThreadMessage,
} from '@/lib/social/messagesApi';
import type { DirectMessage, MessageThread } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

export function MessageThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getThreadWithMessages(threadId);
      setThread(data.thread);
      setMessages(data.messages);
    } catch {
      setError('Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!user || !threadId) return;
    void load();
  }, [user, threadId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!threadId) return <Navigate to="/messages" replace />;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading conversation…" />
      </div>
    );
  }

  if (!thread || error) {
    return (
      <div className="space-y-4">
        <SolidBackButton to="/messages" label="Messages" />
        <p className="text-sm text-muted-foreground">{error || 'Conversation not found.'}</p>
      </div>
    );
  }

  const other = user ? otherParticipant(thread, user.id) : undefined;
  const title = other?.displayName || other?.username || 'Conversation';

  async function handleSend(text: string) {
    if (!threadId) return;
    const message = await sendThreadMessage(threadId, text);
    setMessages((prev) => [...prev, message]);
    setThread((prev) =>
      prev
        ? {
            ...prev,
            lastMessageText: message.text,
            lastMessageAt: message.createdAt,
            lastMessageSenderId: message.senderId,
            unread: false,
          }
        : prev
    );
  }

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-8rem)] flex-col md:-mx-0 md:min-h-[calc(100dvh-6rem)]">
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <SolidBackButton to="/messages" label="Back" className="static" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {other?.username && (
            <p className="truncate text-xs text-muted-foreground">@{other.username}</p>
          )}
        </div>
      </div>

      <MessageContextCard thread={thread} />

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={handleSend} />
    </div>
  );
}
