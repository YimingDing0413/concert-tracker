import { Button } from '@/components/ui/app-button';
import type { SpotifyConnectionStatus } from '@/types/spotify';
import { formatRelativeTime } from '@/utils/format';
import { Music2, RefreshCw, Unplug } from 'lucide-react';

interface SpotifyConnectionsSectionProps {
  status: SpotifyConnectionStatus | null;
  loading?: boolean;
  syncing?: boolean;
  disconnecting?: boolean;
  error?: string | null;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}

export function SpotifyConnectionsSection({
  status,
  loading,
  syncing,
  disconnecting,
  error,
  onConnect,
  onSync,
  onDisconnect,
}: SpotifyConnectionsSectionProps) {
  const connected = status?.connected ?? false;

  return (
    <section className="rounded-2xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1DB954]/15 text-[#1DB954]">
          <Music2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-base font-semibold">Connected accounts</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Link Spotify to personalize concert picks from what you actually listen to.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Checking Spotify…</p>
          ) : connected ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-sm">
                <p className="font-medium text-foreground">
                  Spotify · {status?.spotifyDisplayName ?? 'Connected'}
                </p>
                {status?.lastSyncedAt && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Last synced {formatRelativeTime(status.lastSyncedAt)}
                  </p>
                )}
                {!status?.hasTasteProfile && (
                  <p className="mt-1 text-xs text-amber-400">Sync your taste to unlock recommendations.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={syncing}
                  onClick={() => void onSync()}
                >
                  <RefreshCw className="size-4" aria-hidden />
                  {syncing ? 'Syncing…' : 'Sync Spotify'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disconnecting}
                  onClick={() => void onDisconnect()}
                >
                  <Unplug className="size-4" aria-hidden />
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
              <Button variant="primary" size="sm" onClick={() => void onConnect()}>
                Connect Spotify
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
