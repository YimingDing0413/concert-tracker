import { cn } from '@/lib/utils';
import type { DirectMessage } from '@/types';

interface MessageBubbleProps {
  message: DirectMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] px-4 py-2 text-[0.9375rem] leading-snug',
          isOwn
            ? 'rounded-[22px] rounded-br-[4px] bg-primary text-primary-foreground'
            : 'rounded-[22px] rounded-bl-[4px] bg-muted/80 text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}
