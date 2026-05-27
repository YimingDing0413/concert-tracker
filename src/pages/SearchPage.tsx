import { apiFetch } from '@/api/http';
import { HttpApiError } from '@/api/http';
import { SearchResultItem } from '@/components/search/SearchResultItem';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiNotice } from '@/components/ui/ApiNotice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchResult } from '@/types';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type ApiHealth = {
  ok: boolean;
  apis: { ticketmaster: boolean; bandsintown: boolean; setlistfm: boolean };
};

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const debounced = useDebounce(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMeta, setSearchMeta] = useState<string | undefined>();
  const [apisConfigured, setApisConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((body: { apis?: ApiHealth['apis'] }) => {
        const apis = body.apis;
        if (apis) setApisConfigured(apis.ticketmaster || apis.setlistfm);
      })
      .catch(() => setApisConfigured(false));
  }, []);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    apiFetch<SearchResult[]>(`/api/search?query=${encodeURIComponent(debounced.trim())}`)
      .then((res) => {
        setResults(res.data ?? []);
        setSearchMeta(res.meta?.message);
      })
      .catch((err) => {
        setResults([]);
        setSearchMeta(undefined);
        setError(err instanceof HttpApiError ? err.message : 'Search failed');
      })
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div className="space-y-6 pb-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Artists, venues, and concerts worldwide.</p>
      </header>

      <SearchBar value={query} onChange={setQuery} autoFocus />

      {apisConfigured === false && (
        <ApiNotice message="No API keys detected. Add TICKETMASTER_API_KEY to .env.local and restart the dev server." />
      )}
      {searchMeta && apisConfigured !== false && (
        <ApiNotice message={searchMeta} source="mock" />
      )}

      <section aria-live="polite">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && <LoadingSpinner label="Searching…" />}
        {!loading && debounced && results.length === 0 && !error && (
          <EmptyState
            title="No results"
            description="Try a different spelling or search by city name."
          />
        )}
        {!loading && !debounced && (
          <EmptyState
            title="Start typing"
            description="Search for an artist like “Arctic Monkeys” or a city like “Chicago”."
          />
        )}
        {results.length > 0 && (
          <>
            <SectionHeader title="Results" subtitle={`${results.length} matches`} />
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <SearchResultItem result={r} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
