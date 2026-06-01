import { apiFetch } from '@/api/http';
import { HttpApiError } from '@/api/http';
import { SearchResultItem } from '@/components/search/SearchResultItem';
import { MemberSearch } from '@/components/social/MemberSearch';
import { UsernameEditor } from '@/components/social/UsernameEditor';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiNotice } from '@/components/ui/ApiNotice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { ensureMyProfile } from '@/lib/social/socialApi';
import type { SearchResult, UserProfile } from '@/types';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type ApiHealth = {
  ok: boolean;
  apis: { ticketmaster: boolean; bandsintown: boolean; setlistfm: boolean };
};

type SearchMode = 'concerts' | 'members';

export function SearchPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialMode: SearchMode = searchParams.get('mode') === 'members' ? 'members' : 'concerts';
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [query, setQuery] = useState(initialQ);
  const debounced = useDebounce(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMeta, setSearchMeta] = useState<string | undefined>();
  const [apisConfigured, setApisConfigured] = useState<boolean | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    setMode(searchParams.get('mode') === 'members' ? 'members' : 'concerts');
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    ensureMyProfile(user).then(setProfile);
  }, [user]);

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
    if (mode !== 'concerts') return;
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
  }, [debounced, mode]);

  const currentUserId = user?.id ?? '';
  const hasUsername = Boolean(profile?.username);

  return (
    <div className="space-y-6 pb-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'concerts'
            ? 'Artists, venues, and concerts worldwide.'
            : 'Find friends and other concertgoers.'}
        </p>
      </header>

      <div className="inline-flex rounded-full border border-border/60 bg-card/50 p-1">
        {(['concerts', 'members'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition-colors',
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={mode === m}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'concerts' && (
        <>
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
        </>
      )}

      {mode === 'members' && (
        <MemberSearch
          currentUserId={currentUserId}
          hasUsername={hasUsername}
          onSetUsername={() => setEditorOpen(true)}
        />
      )}

      {user && (
        <UsernameEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          userId={user.id}
          currentUsername={profile?.username}
          currentDisplayName={profile?.displayName ?? user.displayName}
          currentBio={profile?.bio ?? user.bio}
          onSaved={setProfile}
        />
      )}
    </div>
  );
}
