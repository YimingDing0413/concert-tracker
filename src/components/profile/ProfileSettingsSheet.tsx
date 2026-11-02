import { SpotifyConnectionsSection } from '@/components/spotify/SpotifyConnectionsSection';
import { Button } from '@/components/ui/app-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SpotifyConnectionStatus } from '@/types/spotify';
import { LogOut, Pencil } from 'lucide-react';
import { FEATURES } from '@/config/features';

interface ProfileSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditProfile: () => void;
  onLogout: () => void;
  spotifyStatus: SpotifyConnectionStatus | null;
  spotifyLoading: boolean;
  spotifySyncing: boolean;
  spotifyDisconnecting: boolean;
  spotifyConnectError: string | null;
  onSpotifyConnect: () => Promise<void>;
  onSpotifySync: () => Promise<void>;
  onSpotifyDisconnect: () => Promise<void>;
}

export function ProfileSettingsSheet({
  open,
  onOpenChange,
  onEditProfile,
  onLogout,
  spotifyStatus,
  spotifyLoading,
  spotifySyncing,
  spotifyDisconnecting,
  spotifyConnectError,
  onSpotifyConnect,
  onSpotifySync,
  onSpotifyDisconnect,
}: ProfileSettingsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Settings</DialogTitle>
          <DialogDescription>Account, Spotify, and sign out.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <Button
            variant="secondary"
            className="h-11 w-full justify-start gap-2 rounded-[14px]"
            onClick={() => {
              onOpenChange(false);
              onEditProfile();
            }}
          >
            <Pencil className="size-4" aria-hidden />
            Edit profile
          </Button>

          {FEATURES.spotify ? (
            <SpotifyConnectionsSection
              status={spotifyStatus}
              loading={spotifyLoading}
              syncing={spotifySyncing}
              disconnecting={spotifyDisconnecting}
              error={spotifyConnectError}
              onConnect={onSpotifyConnect}
              onSync={onSpotifySync}
              onDisconnect={onSpotifyDisconnect}
            />
          ) : null}

          <Button
            variant="ghost"
            className="h-11 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onOpenChange(false);
              onLogout();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Log out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
