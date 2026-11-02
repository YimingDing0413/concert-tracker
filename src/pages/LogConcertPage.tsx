import { api } from '@/api';
import { apiFetch, HttpApiError } from '@/api/http';
import { Button } from '@/components/ui/app-button';
import { Input } from '@/components/ui/input';
import { SearchBar } from '@/components/ui/SearchBar';
import { TicketCard } from '@/components/ui/TicketCard';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  buildEventSnapshot,
  findDuplicateUserConcert,
  lastWeekendISO,
  localDateISO,
  statusFromDate,
} from '@/lib/logConcert';
import { cn } from '@/lib/utils';
import type { Concert, SearchResult, UserConcert, UserConcertStatus } from '@/types';
import { Calendar, MapPin, Mic2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Step = 'search' | 'confirm' | 'artist' | 'manual' | 'success';

interface PickedShow {
  eventId: string;
  artistName: string;
  venueName?: string;
  city?: string;
  date: string;
  imageUrl?: string;
  fromCatalog: boolean;
}

export function LogConcertPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startManual = params.get('manual') === '1';

  const [step, setStep] = useState<Step>(startManual ? 'manual' : 'search');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [picked, setPicked] = useState<PickedShow | null>(null);
  const [status, setStatus] = useState<UserConcertStatus>('attended');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<UserConcert | null>(null);
  const [synced, setSynced] = useState(true);
  const [editingDate, setEditingDate] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [manualForce, setManualForce] = useState(false);

  const [artistName, setArtistName] = useState('');
  const [artistShows, setArtistShows] = useState<Concert[]>([]);
  const [artistLoading, setArtistLoading] = useState(false);

  const [mArtist, setMArtist] = useState('');
  const [mVenue, setMVenue] = useState('');
  const [mCity, setMCity] = useState('');
  const [mState, setMState] = useState('');
  const [mDate, setMDate] = useState(localDateISO());
  const [mOpeners, setMOpeners] = useState('');
  const [mNotes, setMNotes] = useState('');

  useEffect(() => {
    if (startManual) setStep('manual');
  }, [startManual]);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (!trimmed || step !== 'search') {
      setResults([]);
      setSearchError('');
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    setSearchError('');
    apiFetch<SearchResult[]>(`/api/search?query=${encodeURIComponent(trimmed)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? [];
        setResults(data.filter((r) => r.type === 'event' || r.type === 'artist'));
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setSearchError(err instanceof HttpApiError ? err.message : 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, step]);

  const manualStatus = useMemo(() => statusFromDate(mDate), [mDate]);
  const needsDate = Boolean(picked && !picked.date.trim());

  function openManual() {
    setParams({ manual: '1' }, { replace: true });
    setStep('manual');
    setError('');
    setDuplicateId(null);
    setManualForce(false);
  }

  function backToSearch() {
    setParams({}, { replace: true });
    setStep('search');
    setPicked(null);
    setError('');
    setEditingDate(false);
    setDuplicateId(null);
    setManualForce(false);
  }

  function goToConfirm(show: PickedShow) {
    setPicked(show);
    setEditingDate(!show.date.trim());
    setDuplicateId(null);
    if (show.date.trim()) {
      setStatus(statusFromDate(show.date));
    }
    setStep('confirm');
  }

  async function pickEventResult(result: SearchResult) {
    setError('');
    setSearchLoading(true);
    try {
      const detail = await api.getConcert(result.id);
      const date = (detail?.date ?? '').slice(0, 10);
      goToConfirm({
        eventId: detail?.id ?? result.id,
        artistName: detail?.artistName ?? result.title,
        venueName: detail?.venueName ?? result.subtitle,
        city: detail?.city,
        date,
        imageUrl: detail?.imageUrl ?? result.imageUrl,
        fromCatalog: true,
      });
    } catch {
      goToConfirm({
        eventId: result.id,
        artistName: result.title,
        venueName: result.subtitle,
        date: '',
        imageUrl: result.imageUrl,
        fromCatalog: true,
      });
    } finally {
      setSearchLoading(false);
    }
  }

  async function pickArtistResult(result: SearchResult) {
    setError('');
    setArtistName(result.title);
    setArtistLoading(true);
    setStep('artist');
    try {
      const detail = await api.getArtist(result.id);
      const past = detail?.pastConcerts ?? [];
      const upcoming = detail?.upcomingConcerts ?? [];
      setArtistShows([...past, ...upcoming]);
      if (!detail) {
        try {
          const byName = await api.getArtist(result.title);
          setArtistShows([
            ...(byName?.pastConcerts ?? []),
            ...(byName?.upcomingConcerts ?? []),
          ]);
        } catch {
          setArtistShows([]);
        }
      }
    } catch {
      setArtistShows([]);
      setError('Could not load shows for this artist.');
    } finally {
      setArtistLoading(false);
    }
  }

  function pickArtistShow(concert: Concert) {
    goToConfirm({
      eventId: concert.id,
      artistName: concert.artistName || artistName,
      venueName: concert.venueName,
      city: concert.city,
      date: (concert.date ?? '').slice(0, 10),
      imageUrl: concert.imageUrl,
      fromCatalog: true,
    });
  }

  function updatePickedDate(date: string) {
    const day = date.slice(0, 10);
    setPicked((prev) => (prev ? { ...prev, date: day } : prev));
    if (day) setStatus(statusFromDate(day));
    setDuplicateId(null);
  }

  async function confirmLog() {
    if (!user || !picked) return;
    if (!picked.date.trim()) {
      setError('Date is required.');
      setEditingDate(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const existing = await api.getUserConcerts(user.id);
      const dup = findDuplicateUserConcert(existing, picked.artistName, picked.date);
      if (dup) {
        setDuplicateId(dup.concertId);
        setError('Already logged');
        return;
      }
      const snapshot = buildEventSnapshot({
        id: picked.eventId,
        artistName: picked.artistName,
        venueName: picked.venueName,
        city: picked.city,
        date: picked.date,
        imageUrl: picked.imageUrl,
      });
      const result = await api.setConcertStatus(user.id, picked.eventId, status, snapshot);
      setSaved(result.userConcert);
      setSynced(result.synced);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log show.');
    } finally {
      setSaving(false);
    }
  }

  async function submitManual(e?: React.FormEvent, forceDuplicate = false) {
    e?.preventDefault();
    if (!user) return;
    if (!mArtist.trim() || !mDate) {
      setError('Artist and date are required.');
      return;
    }
    const allowDuplicate = forceDuplicate || manualForce;
    setSaving(true);
    setError('');
    try {
      if (!allowDuplicate) {
        const existing = await api.getUserConcerts(user.id);
        const dup = findDuplicateUserConcert(existing, mArtist, mDate);
        if (dup) {
          setDuplicateId(dup.concertId);
          setError('Already logged');
          return;
        }
      }
      const result = await api.addManualConcert(user.id, {
        artistName: mArtist.trim(),
        venueName: mVenue.trim() || undefined,
        city: mCity.trim() || undefined,
        state: mState.trim() || undefined,
        date: mDate,
        openers: mOpeners.trim() || undefined,
        notes: mNotes.trim() || undefined,
        status: manualStatus,
      });
      setPicked({
        eventId: result.userConcert.concertId,
        artistName: mArtist.trim(),
        venueName: mVenue.trim() || undefined,
        city: mCity.trim() || undefined,
        date: mDate,
        fromCatalog: false,
      });
      setStatus(manualStatus);
      setSaved(result.userConcert);
      setSynced(result.synced);
      setManualForce(false);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save concert.');
    } finally {
      setSaving(false);
    }
  }

  function logAnother() {
    setPicked(null);
    setSaved(null);
    setSynced(true);
    setQuery('');
    setResults([]);
    setArtistShows([]);
    setMArtist('');
    setMVenue('');
    setMCity('');
    setMState('');
    setMDate(localDateISO());
    setMOpeners('');
    setMNotes('');
    setError('');
    setEditingDate(false);
    setDuplicateId(null);
    setManualForce(false);
    backToSearch();
  }

  if (!user) return null;

  const successArtist =
    picked?.artistName ?? saved?.concertSnapshot?.artistName ?? saved?.manualConcert?.artistName ?? 'Show';
  const successVenue =
    picked?.venueName ?? saved?.concertSnapshot?.venueName ?? saved?.manualConcert?.venueName;
  const successCity =
    picked?.city ?? saved?.concertSnapshot?.city ?? saved?.manualConcert?.city;
  const successDate =
    picked?.date ?? saved?.concertSnapshot?.date ?? saved?.manualConcert?.date ?? '';
  const successId = saved?.concertId ?? picked?.eventId;

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">Log a show</h1>
        <p className="text-sm text-muted-foreground">
          Search, tap, done — rating is optional later.
        </p>
      </header>

      {error && (
        <div
          className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <p>{error}</p>
          {step === 'manual' && duplicateId && !manualForce && (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={saving}
              onClick={() => {
                setManualForce(true);
                setError('');
                setDuplicateId(null);
                void submitManual(undefined, true);
              }}
            >
              Log anyway?
            </Button>
          )}
          {step === 'confirm' && duplicateId && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => navigate(`/concert/${encodeURIComponent(duplicateId)}`)}
            >
              View logged show
            </Button>
          )}
        </div>
      )}

      {step === 'search' && (
        <div className="space-y-4">
          <SearchBar
            placeholder="Search artist or concert…"
            value={query}
            onChange={setQuery}
            autoFocus
          />
          {searchLoading && query.trim() && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {searchError && <p className="text-sm text-destructive">{searchError}</p>}
          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() =>
                      void (result.type === 'artist'
                        ? pickArtistResult(result)
                        : pickEventResult(result))
                    }
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt=""
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                        {result.type === 'artist' ? (
                          <Mic2 className="size-5 text-primary" aria-hidden />
                        ) : (
                          <Calendar className="size-5 text-primary" aria-hidden />
                        )}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.type === 'artist' ? 'Artist · view past & upcoming' : result.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && !searchLoading && results.length === 0 && !searchError && (
            <p className="text-sm text-muted-foreground">No matches. Try another search or add it manually.</p>
          )}
          <ManualLink onClick={openManual} />
        </div>
      )}

      {step === 'artist' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={backToSearch}
            className="min-h-11 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Back to search
          </button>
          <h2 className="text-lg font-bold">{artistName}</h2>
          <p className="text-sm text-muted-foreground">Pick a past or upcoming show to log.</p>
          {artistLoading && <p className="text-sm text-muted-foreground">Loading shows…</p>}
          {!artistLoading && artistShows.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No catalog shows found for this artist.</p>
              <ManualLink onClick={openManual} />
            </div>
          )}
          <ul className="space-y-2">
            {artistShows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pickArtistShow(c)}
                  className="flex min-h-11 w-full flex-col gap-0.5 rounded-xl border border-border/50 bg-card/60 p-3 text-left hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium">
                    {c.venueName || 'Unknown venue'}
                    {c.city ? ` · ${c.city}` : ''}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.date} · {c.status === 'past' ? 'Past' : 'Upcoming'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <ManualLink onClick={openManual} />
        </div>
      )}

      {step === 'confirm' && picked && (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => (artistShows.length ? setStep('artist') : backToSearch())}
            className="min-h-11 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Change show
          </button>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-lg font-bold">{picked.artistName}</p>
            {(picked.venueName || picked.city) && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {[picked.venueName, picked.city].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-2 space-y-2">
              {editingDate || needsDate ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">
                    Date {needsDate && <span className="text-destructive">*</span>}
                  </span>
                  <Input
                    type="date"
                    value={picked.date}
                    onChange={(e) => updatePickedDate(e.target.value)}
                    required={needsDate}
                    className="min-h-11"
                    autoFocus={needsDate}
                  />
                </label>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" aria-hidden />
                    {picked.date}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingDate(true)}
                    className="min-h-11 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Edit date
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'attended' as const, label: 'I was there' },
                  { id: 'going' as const, label: "I'm going" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id)}
                  className={cn(
                    'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    status === opt.id
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border/60 bg-card/60 text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            fullWidth
            disabled={saving || Boolean(duplicateId) || needsDate}
            onClick={() => void confirmLog()}
          >
            {saving ? 'Saving…' : status === 'attended' ? 'Log — I was there' : "Log — I'm going"}
          </Button>
          <ManualLink onClick={openManual} />
        </div>
      )}

      {step === 'manual' && (
        <form className="space-y-4" onSubmit={(e) => void submitManual(e)}>
          <button
            type="button"
            onClick={backToSearch}
            className="min-h-11 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Back to search
          </button>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              Artist <span className="text-destructive">*</span>
            </span>
            <Input
              value={mArtist}
              onChange={(e) => {
                setMArtist(e.target.value);
                setDuplicateId(null);
                setManualForce(false);
              }}
              required
              className="min-h-11"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              Date <span className="text-destructive">*</span>
            </span>
            <Input
              type="date"
              value={mDate}
              onChange={(e) => {
                setMDate(e.target.value);
                setDuplicateId(null);
                setManualForce(false);
              }}
              required
              className="min-h-11"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: 'Today', value: localDateISO() },
                { label: 'Yesterday', value: localDateISO(-1) },
                { label: 'Last weekend', value: lastWeekendISO() },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setMDate(chip.value);
                    setDuplicateId(null);
                    setManualForce(false);
                  }}
                  className={cn(
                    'min-h-11 rounded-full border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    mDate === chip.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border/60 text-muted-foreground'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </label>
          <p className="text-xs text-muted-foreground">
            Will save as{' '}
            <span className="font-semibold text-foreground">
              {manualStatus === 'attended' ? 'I was there' : "I'm going"}
            </span>{' '}
            based on the date.
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Venue</span>
            <Input value={mVenue} onChange={(e) => setMVenue(e.target.value)} className="min-h-11" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">City</span>
              <Input value={mCity} onChange={(e) => setMCity(e.target.value)} className="min-h-11" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">State</span>
              <Input value={mState} onChange={(e) => setMState(e.target.value)} className="min-h-11" />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Openers</span>
            <Input
              value={mOpeners}
              onChange={(e) => setMOpeners(e.target.value)}
              placeholder="Comma-separated"
              className="min-h-11"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Notes</span>
            <textarea
              value={mNotes}
              onChange={(e) => setMNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <Button type="submit" fullWidth disabled={saving}>
            {saving
              ? 'Saving…'
              : manualForce
                ? 'Log anyway'
                : 'Save concert'}
          </Button>
        </form>
      )}

      {step === 'success' && (
        <div className="space-y-5">
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Logged</p>
            <h2 className="text-xl font-black tracking-tight">You&apos;re on the list</h2>
          </div>
          {!synced && (
            <p className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-center text-sm text-muted-foreground">
              Saved on this device only — we&apos;ll sync it when you&apos;re back online
            </p>
          )}
          <TicketCard
            className="ticket-enter"
            artist={successArtist}
            venue={successVenue}
            city={successCity}
            date={successDate || localDateISO()}
            variant={status === 'attended' ? 'paper' : 'outline'}
          />
          <div className="flex flex-col gap-2">
            {successId && (
              <Button
                fullWidth
                onClick={() =>
                  navigate(`/concert/${encodeURIComponent(successId)}/review`, {
                    state: {
                      backTo: '/log',
                      afterSaveRedirect: '/profile',
                      concertSnapshot: {
                        artistName: successArtist,
                        venueName: successVenue,
                        city: successCity,
                        date: successDate,
                      },
                    },
                  })
                }
              >
                Add rating & photos
              </Button>
            )}
            <Button fullWidth variant="secondary" onClick={logAnother}>
              <Plus className="mr-1 size-4" aria-hidden />
              Log another
            </Button>
            <Button fullWidth variant="ghost" onClick={() => navigate('/')}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Can&apos;t find it? Add it manually
    </button>
  );
}
