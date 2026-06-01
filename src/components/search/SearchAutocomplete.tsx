import { apiFetch, HttpApiError } from '@/api/http';
import { SearchBar } from '@/components/ui/SearchBar';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types';
import { ChevronRight, MapPin, Mic2, Search, Ticket } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const typeIcons = {
  artist: Mic2,
  venue: MapPin,
  event: Ticket,
} as const;

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

interface SearchAutocompleteProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Max results shown in the dropdown */
  limit?: number;
}

export function SearchAutocomplete({
  placeholder = 'Search artists, venues, cities…',
  className,
  autoFocus,
  limit = 6,
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(query, 250);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (!trimmed) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<SearchResult[]>(`/api/search?query=${encodeURIComponent(trimmed)}`)
      .then((res) => {
        if (cancelled) return;
        setResults(res.data ?? []);
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

  const trimmed = query.trim();
  const showPanel = open && trimmed.length > 0;

  useLayoutEffect(() => {
    if (!showPanel) return;
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelRect({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [showPanel]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      const panel = document.getElementById('search-autocomplete-panel');
      if (panel && panel.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function goToFullSearch() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  function selectResult(result: SearchResult) {
    setOpen(false);
    setQuery('');
    navigate(resultPath(result));
  }

  const shown = results.slice(0, limit);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToFullSearch();
        }}
      >
        <SearchBar
          value={query}
          onChange={(v) => {
            setQuery(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </form>

      {showPanel && panelRect &&
        createPortal(
          <div
            id="search-autocomplete-panel"
            style={{
              position: 'fixed',
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
            }}
            className="z-50 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-md"
          >
          {loading && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
          )}
          {!loading && error && (
            <p className="px-4 py-3 text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && shown.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No matches yet — keep typing or press Enter.
            </p>
          )}
          {!loading && !error && shown.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {shown.map((result) => {
                const Icon = typeIcons[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
                    >
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-lg border border-border/50 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                          <Icon className="size-4 text-primary" aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {result.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={goToFullSearch}
            className="flex w-full items-center gap-2 border-t border-border/50 px-4 py-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Search className="size-4" aria-hidden />
            See all results for “{trimmed}”
          </button>
          </div>,
          document.body
        )}
    </div>
  );
}
