import { apiFetchData } from '@/api/http';
import type { DirectMessage, MessageThread, OpenThreadInput } from '@/types';

/** Messaging uses Bearer auth only — no client-supplied userId. */

/** Thread ids contain `#` — always encode for router paths. */
export function messageThreadPath(threadId: string): string {
  return `/messages/${encodeURIComponent(threadId)}`;
}

export function decodeThreadIdParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

export async function openDmThread(
  input: OpenThreadInput
): Promise<MessageThread> {
  const res = await apiFetchData<{ thread: MessageThread }>('/api/messages/thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.thread;
}

export async function getMessageThreads(): Promise<MessageThread[]> {
  return apiFetchData<MessageThread[]>('/api/messages/threads');
}

export async function getUnreadMessageCount(): Promise<number> {
  const res = await apiFetchData<{ count: number }>('/api/messages/unread-count');
  return res.count;
}

export async function getThreadWithMessages(threadId: string): Promise<{
  thread: MessageThread;
  messages: DirectMessage[];
}> {
  return apiFetchData<{ thread: MessageThread; messages: DirectMessage[] }>(
    `/api/messages/${encodeURIComponent(threadId)}`
  );
}

export async function sendThreadMessage(
  threadId: string,
  text: string
): Promise<DirectMessage> {
  const res = await apiFetchData<{ message: DirectMessage }>(
    `/api/messages/${encodeURIComponent(threadId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }
  );
  return res.message;
}

export async function markThreadAsRead(threadId: string): Promise<void> {
  await apiFetchData<{ ok: boolean }>(
    `/api/messages/${encodeURIComponent(threadId)}/read`,
    { method: 'POST' }
  );
}

export function buildTicketPrefill(context: {
  artistName?: string;
  venueName?: string;
  eventDate?: string;
}): string {
  const artist = context.artistName ?? 'this show';
  let detail = '';
  if (context.venueName) detail += ` at ${context.venueName}`;
  if (context.eventDate) detail += ` on ${context.eventDate}`;
  return `Hey, I saw you're looking for tickets to ${artist}${detail}. I may be able to help.`;
}

export function otherParticipant(
  thread: MessageThread,
  currentUserId: string
): MessageThread['participantProfiles'][number] | undefined {
  return (
    thread.participantProfiles.find((p) => p.userId !== currentUserId) ??
    thread.participantProfiles[0]
  );
}
