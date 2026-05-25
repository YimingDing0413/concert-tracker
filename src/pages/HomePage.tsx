import { api } from '@/api';
import { HttpApiError } from '@/api/http';
import { SearchResultItem } from '@/components/search/SearchResultItem';
import { SearchBar } from '@/components/ui/SearchBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchResult } from '@/types';
import { useEffect, useState } from 'react';

export function HomePage() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    api
      .search(debounced)
      .then(setResults)
      .catch((err) => {
        setResults([]);
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
      <section className="search-results" aria-live="polite">
        {error && <p className="form-error">{error}</p>}
        {loading && <LoadingSpinner label="Searching…" />}
        {!loading && debounced && !error && results.length === 0 && (
          <EmptyState title="No results" description="Try another artist, venue, or city." />
        )}
        {!loading &&
          results.map((r) => <SearchResultItem key={`${r.type}-${r.id}`} result={r} />)}
        {!debounced && (
          <div className="home-suggestions">
            <p className="muted">Try searching:</p>
            <ul>
              <li>Phoebe Bridgers</li>
              <li>Madison Square Garden</li>
              <li>Red Rocks</li>
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
