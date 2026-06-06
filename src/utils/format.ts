export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(time?: string): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatLocation(city: string, state?: string, country?: string): string {
  if (state) return `${city}, ${state}`;
  return `${city}, ${country ?? ''}`;
}

export function averageRating(values: number[]): number | null {
  const rated = values.filter((v) => v > 0);
  if (!rated.length) return null;
  return Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10;
}

/** Average of Beli-style 1–10 overall ratings */
export function averageOverallRating(values: number[]): number | null {
  return averageRating(values);
}

export function formatOverallRating(avg: number | null): string {
  if (avg == null) return '—';
  return `${avg}/10`;
}
