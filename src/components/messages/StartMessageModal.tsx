import { MessageContextCard } from '@/components/messages/MessageContextCard';
import { Button } from '@/components/ui/app-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getTokenUserId } from '@/lib/auth/session';
import { openDmThread, sendThreadMessage } from '@/lib/social/messagesApi';
import type { FeedPost, MessageThread, MessageThreadContext } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StartMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetLabel?: string;
  prefilledText: string;
  context?: MessageThreadContext;
  /** Shown as a thread stub before send */
  contextThread?: Partial<MessageThread>;
  feedPost?: FeedPost;
}

export function StartMessageModal({
  open,
  onOpenChange,
  targetUserId,
  targetLabel,
  prefilledText,
  context,
  contextThread,
  feedPost,
}: StartMessageModalProps) {
  const navigate = useNavigate();
  const [text, setText] = useState(prefilledText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setText(prefilledText);
      setError('');
    }
  }, [open, prefilledText]);

  const threadStub: MessageThread | null = contextThread
    ? ({ ...contextThread, id: contextThread.id ?? '', participantIds: contextThread.participantIds ?? [], participantProfiles: contextThread.participantProfiles ?? [], createdAt: contextThread.createdAt ?? '', updatedAt: contextThread.updatedAt ?? '' } as MessageThread)
    : feedPost
      ? {
          id: 'preview',
          participantIds: [],
          participantProfiles: [],
          createdAt: '',
          updatedAt: '',
          contextType: 'looking_for_tickets',
          eventId: feedPost.eventId,
          artistName: feedPost.artistName,
          venueName: feedPost.venueName,
          eventDate: feedPost.eventDate,
          feedPostId: feedPost.id,
        }
      : null;

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const authedUserId = getTokenUserId();
    if (authedUserId && authedUserId === targetUserId) {
      setError(
        "You can't message yourself. If this is your ticket post, wait for another member to respond."
      );
      return;
    }

    setSending(true);
    setError('');
    try {
      const thread = await openDmThread({
        targetUserId,
        context: context ?? {
          contextType: feedPost?.type === 'looking_for_tickets' ? 'looking_for_tickets' : 'general',
          eventId: feedPost?.eventId,
          artistName: feedPost?.artistName,
          venueName: feedPost?.venueName,
          eventDate: feedPost?.eventDate,
          feedPostId: feedPost?.id,
        },
      });
      await sendThreadMessage(thread.id, trimmed);
      onOpenChange(false);
      navigate(`/messages/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message {targetLabel ?? 'member'}</DialogTitle>
          <DialogDescription>
            Start a direct message. Encore does not verify ticket sellers or process payments.
          </DialogDescription>
        </DialogHeader>

        {threadStub?.artistName && <MessageContextCard thread={threadStub} />}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={sending || !text.trim()} onClick={() => void handleSend()}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
