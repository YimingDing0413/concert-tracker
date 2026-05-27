export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '');
}

/** Higher score = better match for the user's query. */
export function scoreSearchMatch(title: string, query: string): number {
  const t = normalizeSearchText(title);
  const q = normalizeSearchText(query);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 88;

  const queryWords = q.split(' ').filter(Boolean);
  const titleWords = t.split(' ').filter(Boolean);

  if (queryWords.length > 1 && queryWords.every((w) => t.includes(w))) return 78;
  if (t.includes(q)) return 68;

  const matchedWords = queryWords.filter((qw) =>
    titleWords.some((tw) => tw.startsWith(qw) || tw.includes(qw))
  );
  if (matchedWords.length === queryWords.length) return 58;
  if (matchedWords.length > 0) {
    return 32 + (matchedWords.length / queryWords.length) * 20;
  }

  return 0;
}

export function sortBySearchRelevance<T extends { title: string }>(
  results: T[],
  query: string
): T[] {
  return [...results].sort(
    (a, b) => scoreSearchMatch(b.title, query) - scoreSearchMatch(a.title, query)
  );
}

export function artistDedupeKey(name: string): string {
  return normalizeSearchText(name);
}
