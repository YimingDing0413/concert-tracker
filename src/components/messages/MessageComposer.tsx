import { Button } from '@/components/ui/app-button';
import { Send } from 'lucide-react';
import { useState } from 'react';

interface MessageComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  onSend,
  disabled,
  placeholder = 'Message…',
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex items-end gap-2 border-t border-border/50 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        placeholder={placeholder}
        disabled={disabled || sending}
        className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-sm outline-none focus:border-primary/40"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(e);
          }
        }}
      />
      <Button
        type="submit"
        variant="primary"
        size="icon"
        disabled={!text.trim() || sending || disabled}
        aria-label="Send message"
      >
        <Send className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
