import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageChatHeader } from '@/components/messages/MessageChatHeader';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { MessageContextCard } from '@/components/messages/MessageContextCard';
import { Button } from '@/components/ui/app-button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useMessages } from '@/context/MessagesContext';
import { useAuth } from '@/context/AuthContext';
import {
  decodeThreadIdParam,
  getThreadWithMessages,
  sendThreadMessage,
} from '@/lib/social/messagesApi';
import type { DirectMessage, MessageThread } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

export function MessageChatView() {
  const { threadId: threadIdParam } = useParams<{ threadId: string }>();
  const threadId = threadIdParam ? decodeThreadIdParam(threadIdParam) : '';
  const { user } = useAuth();
  const { patchThread, refreshThreads } = useMessages();
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getThreadWithMessages(threadId);
      setThread(data.thread);
      setMessages(data.messages);
      patchThread(threadId, { unread: false, lastReadAt: new Date().toISOString() });
      void refreshThreads();
    } catch {
      setThread(null);
      setMessages([]);
      setError('Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [threadId, patchThread, refreshThreads]);

  useEffect(() => {
    if (!user || !threadId) return;
    void load();
  }, [user, threadId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!threadId) return null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner label="Loading conversation…" />
      </div>
    );
  }

  if (!thread || error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">{error || 'Conversation not found.'}</p>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  async function handleSend(text: string) {
    if (!threadId) return;
    setSendError('');
    try {
      const message = await sendThreadMessage(threadId, text);
      setMessages((prev) => [...prev, message]);
      const patch = {
        lastMessageText: message.text,
        lastMessageAt: message.createdAt,
        lastMessageSenderId: message.senderId,
        unread: false,
      };
      setThread((prev) => (prev ? { ...prev, ...patch } : prev));
      patchThread(threadId, patch);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send message.');
      throw err;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <MessageChatHeader thread={thread} currentUserId={user!.id} showBack />

      {thread.contextType === 'looking_for_tickets' && (
        <div className="shrink-0 border-b border-border/40 px-3 py-2">
          <MessageContextCard thread={thread} />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Say hi — your message will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="shrink-0 px-4 pb-1 text-center text-xs text-destructive">{sendError}</p>
      )}

      <MessageComposer onSend={handleSend} />
    </div>
  );
}
