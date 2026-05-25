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
