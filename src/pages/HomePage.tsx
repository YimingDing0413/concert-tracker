import { apiFetch } from '@/api/http';
import { HttpApiError } from '@/api/http';
import { SearchResultItem } from '@/components/search/SearchResultItem';
import { SearchBar } from '@/components/ui/SearchBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiNotice } from '@/components/ui/ApiNotice';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchResult } from '@/types';
import { useEffect, useState } from 'react';

type ApiHealth = {
  ok: boolean;
  apis: { ticketmaster: boolean; bandsintown: boolean; setlistfm: boolean };
};

export function HomePage() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMeta, setSearchMeta] = useState<string | undefined>();
  const [apisConfigured, setApisConfigured] = useState<boolean | null>(null);

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
    <div className="page home-page">
      <header className="home-hero">
        <h1 className="logo">Encore</h1>
        <p className="home-tagline">Discover concerts. Track every show.</p>
      </header>
      <SearchBar value={query} onChange={setQuery} autoFocus />
      {apisConfigured === false && (
        <ApiNotice
          message="No API keys detected. Add TICKETMASTER_API_KEY (and SETLISTFM_API_KEY) to .env.local in the project folder, then restart npm run dev. Or run: npx vercel env pull .env.local"
        />
      )}
      {searchMeta && apisConfigured !== false && (
        <ApiNotice message={searchMeta} source="mock" />
      )}
      <section className="search-results" aria-live="polite">
        {error && <p className="form-error">{error}</p>}
        {loading && <LoadingSpinner label="Searching…" />}
        {!loading && debounced && !error && results.length === 0 && (
          <EmptyState title="No results" description="Try another artist, venue, or city." />
        )}
        {!loading &&
          results.map((r) => <SearchResultItem key={`${r.type}-${r.id}`} result={r} />)}
        {!debounced && (
          <p className="home-suggestions muted">
            Search for an artist, venue, city, or concert name.
          </p>
        )}
      </section>
    </div>
  );
}
