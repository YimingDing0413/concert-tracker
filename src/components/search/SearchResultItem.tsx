import { StatusBadge as Badge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SearchResult } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight, MapPin, Mic2, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

function resultPath(result: SearchResult): string {
  switch (result.type) {
    case 'artist':
      return `/artist/${result.id}`;
    case 'venue':
      return `/venue/${result.id}`;
    case 'event':
      return `/concert/${result.id}`;
  }
}

const typeIcons = {
  artist: Mic2,
  venue: MapPin,
  event: Ticket,
} as const;

interface SearchResultItemProps {
  result: SearchResult;
}

export function SearchResultItem({ result }: SearchResultItemProps) {
  const Icon = typeIcons[result.type];

  return (
    <Link to={resultPath(result)} className="block no-underline hover:no-underline">
      <Card className="py-0 transition-colors hover:bg-accent/30">
        <CardContent className="flex items-center gap-3 p-3">
          {result.imageUrl ? (
            <img
              src={result.imageUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-xl border border-border/50 object-cover object-center"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Icon className="size-5 text-primary" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="truncate font-medium text-foreground">{result.title}</span>
              <Badge type={result.type} />
            </div>
            <span className="line-clamp-1 text-sm text-muted-foreground">{result.subtitle}</span>
          </div>
          <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground')} aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
