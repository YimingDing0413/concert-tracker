import { HttpApiError } from '@/api/http';
import { MemberCard } from '@/components/social/MemberCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDebounce } from '@/hooks/useDebounce';
import { searchMembers } from '@/lib/social/socialApi';
import type { MemberSearchResult } from '@/types';
import { UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MemberSearchProps {
  currentUserId: string;
  hasUsername: boolean;
  onSetUsername?: () => void;
}

export function MemberSearch({ currentUserId, hasUsername, onSetUsername }: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    searchMembers(q, currentUserId)
      .then((res) => {
        if (!cancelled) setResults(res);
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
  }, [debounced, currentUserId]);

  const trimmed = debounced.trim();

  return (
    <div className="space-y-4">
      {!hasUsername && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-primary">
              <UserPlus className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-medium text-foreground">
              Create a username so friends can find you
            </p>
          </div>
          <Button size="sm" className="rounded-full" onClick={onSetUsername}>
            Set username
          </Button>
        </div>
      )}

      <SearchBar value={query} onChange={setQuery} placeholder="Search members by @username" />

      <section aria-live="polite">
        {error && <p className="px-1 py-2 text-sm text-destructive">{error}</p>}
        {loading && <LoadingSpinner label="Searching members…" />}

        {!loading && !error && trimmed && results.length === 0 && (
          <EmptyState
            title={`No members found for @${trimmed}`}
            description="Double-check the username or invite them to join."
          />
        )}

        {!loading && !trimmed && (
          <EmptyState
            title="Find your friends"
            description="Search by username to follow other concertgoers."
          />
        )}

        {results.length > 0 && (
          <ul className="space-y-2">
            {results.map((m) => (
              <li key={m.userId}>
                <MemberCard
                  currentUserId={currentUserId}
                  userId={m.userId}
                  username={m.username}
                  displayName={m.displayName}
                  avatarUrl={m.avatarUrl}
                  followersCount={m.followersCount}
                  initialFollowing={m.isFollowing}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
