import { api } from '@/api';
import { apiFetch, HttpApiError } from '@/api/http';
import { SearchBar } from '@/components/ui/SearchBar';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { ConcertDetail, SearchResult } from '@/types';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface SelectedConcertEvent {
  eventId: string;
  artistName: string;
  venueName?: string;
  city?: string;
  eventDate?: string;
  imageUrl?: string;
}

interface ConcertEventPickerProps {
  selected?: SelectedConcertEvent | null;
  onSelect: (event: SelectedConcertEvent) => void;
  onClear?: () => void;
  placeholder?: string;
  emptyHint?: string;
}

export function ConcertEventPicker({
  selected,
  onSelect,
  onClear,
  placeholder = 'Search artist or event…',
  emptyHint = 'Search for the concert you want tickets to.',
}: ConcertEventPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounced = useDebounce(query, 250);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (!trimmed) {
      setResults([]);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<SearchResult[]>(`/api/search?query=${encodeURIComponent(trimmed)}`)
      .then((res) => {
        if (cancelled) return;
        setResults((res.data ?? []).filter((r) => r.type === 'event'));
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setError(err instanceof HttpApiError ? err.message : 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  async function pickEvent(result: SearchResult) {
    setLoading(true);
    try {
      const detail = await api.getConcert(result.id);
      const mapped = mapConcertDetail(result, detail);
      onSelect(mapped);
      setQuery('');
      setResults([]);
    } catch {
      onSelect({
        eventId: result.id,
        artistName: result.title,
        venueName: result.subtitle,
        imageUrl: result.imageUrl,
      });
      setQuery('');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{selected.artistName}</p>
            {selected.venueName && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {selected.venueName}
                {selected.city ? ` · ${selected.city}` : ''}
              </p>
            )}
            {selected.eventDate && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                {selected.eventDate}
              </p>
            )}
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-sm font-medium text-primary"
            >
              Change
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchBar placeholder={placeholder} value={query} onChange={setQuery} />
      {!query.trim() && (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      )}
      {loading && query.trim() && (
        <p className="text-sm text-muted-foreground">Searching…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => void pickEvent(result)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-card'
                )}
              >
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Ticket className="size-5 text-primary" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{result.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {result.subtitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && !loading && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">No concerts found. Try another search.</p>
      )}
    </div>
  );
}

function mapConcertDetail(
  result: SearchResult,
  detail: ConcertDetail | null
): SelectedConcertEvent {
  if (!detail) {
    return {
      eventId: result.id,
      artistName: result.title,
      venueName: result.subtitle,
      imageUrl: result.imageUrl,
    };
  }
  return {
    eventId: detail.id,
    artistName: detail.artistName,
    venueName: detail.venueName,
    city: detail.city,
    eventDate: detail.date,
    imageUrl: detail.imageUrl ?? result.imageUrl,
  };
}
