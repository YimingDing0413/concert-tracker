import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface ApiNoticeProps {
  message?: string;
  source?: string;
  className?: string;
}

export function ApiNotice({ message, source, className }: ApiNoticeProps) {
  if (!message && source !== 'mock' && source !== 'partial') return null;
  const text =
    message ??
    (source === 'mock'
      ? 'Showing sample data — add API keys in Vercel env vars (or .env.local) to load real info.'
      : '');

  if (!text) return null;

  return (
    <Alert className={cn('border-primary/20 bg-primary/5', className)} role="status">
      <Info className="size-4 text-primary" />
      <AlertDescription className="text-muted-foreground">{text}</AlertDescription>
    </Alert>
  );
}
