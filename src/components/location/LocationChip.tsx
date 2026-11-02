import { Button } from '@/components/ui/app-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestUserPosition } from '@/lib/geolocation';
import {
  LOCATION_CITY_PRESETS,
  type StoredLocation,
  writeStoredLocation,
} from '@/lib/location';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

interface LocationChipProps {
  location: StoredLocation;
  onChange: (next: StoredLocation) => void;
  className?: string;
}

export function LocationChip({ location, onChange, className }: LocationChipProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function selectCity(city: StoredLocation) {
    writeStoredLocation(city);
    onChange(city);
    setOpen(false);
    setError('');
  }

  async function locateHere() {
    setBusy(true);
    setError('');
    try {
      const pos = await requestUserPosition();
      const next: StoredLocation = {
        label: 'Near you',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      writeStoredLocation(next);
      onChange(next);
      setOpen(false);
    } catch {
      setError('Could not read your location. Pick a city instead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MapPin className="size-3.5 text-primary" aria-hidden />
        <span className="max-w-[10rem] truncate">{location.label}</span>
        <span className="text-muted-foreground" aria-hidden>
          ▾
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm space-y-4">
          <DialogHeader>
            <DialogTitle>Choose location</DialogTitle>
            <DialogDescription>
              Discover and the map use this location for nearby shows.
            </DialogDescription>
          </DialogHeader>

          <Button fullWidth disabled={busy} onClick={() => void locateHere()}>
            {busy ? 'Locating…' : 'Use my current location'}
          </Button>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cities
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {LOCATION_CITY_PRESETS.map((city) => (
                <li key={city.label}>
                  <button
                    type="button"
                    onClick={() => selectCity(city)}
                    className={cn(
                      'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      location.label === city.label
                        ? 'bg-primary/15 text-primary'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    {city.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
