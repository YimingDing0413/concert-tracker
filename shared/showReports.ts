import type {
  AggregatedConfidenceLabel,
  AggregatedField,
  AggregatedShowTiming,
  ShowReportSourceType,
  SourceBreakdown,
  UserShowReport,
} from './types/index.js';

export const SOURCE_TRUST_RANK: Record<ShowReportSourceType, number> = {
  venue_email: 6,
  ticket_email: 5,
  venue_post: 4,
  artist_post: 3,
  was_there: 2,
  other: 1,
};

const EMPTY_BREAKDOWN = (): SourceBreakdown => ({
  was_there: 0,
  venue_email: 0,
  artist_post: 0,
  venue_post: 0,
  ticket_email: 0,
  other: 0,
});

/** Parse user time input into 24h HH:MM for comparison and display. */
export function normalizeTime(value: string): string | null {
  const raw = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(a|am|p|pm)?$/i);
  if (!match) {
    const colon = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (colon) {
      const h = parseInt(colon[1], 10);
      const m = parseInt(colon[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return null;
  }

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toLowerCase();

  if (period?.startsWith('p') && h < 12) h += 12;
  if (period?.startsWith('a') && h === 12) h = 0;
  if (!period && h >= 1 && h <= 11) h += 12;

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeArtistName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function parseOpenerNames(input: string): string[] {
  if (!input.trim()) return [];
  return input
    .split(/[,;&]|\band\b/gi)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

function openerListKey(names: string[]): string {
  return names
    .map(normalizeArtistName)
    .filter(Boolean)
    .sort()
    .join('|');
}

function titleCaseName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function addSource(breakdown: SourceBreakdown, source?: ShowReportSourceType): void {
  if (!source) return;
  breakdown[source] += 1;
}

export function calculateConfidenceScore(
  reportCount: number,
  totalReports: number,
  sourceBreakdown: SourceBreakdown
): number {
  if (totalReports === 0 || reportCount === 0) return 0;
  const agreement = reportCount / totalReports;
  const trustSum = (Object.keys(SOURCE_TRUST_RANK) as ShowReportSourceType[]).reduce(
    (sum, key) => sum + sourceBreakdown[key] * SOURCE_TRUST_RANK[key],
    0
  );
  const trustMax = reportCount * SOURCE_TRUST_RANK.venue_email;
  const trustRatio = trustMax > 0 ? trustSum / trustMax : 0;
  return Math.min(1, agreement * 0.7 + trustRatio * 0.3);
}

export function confidenceLabelFromScore(score: number): AggregatedConfidenceLabel {
  if (score >= 0.65) return 'high';
  if (score >= 0.35) return 'medium';
  return 'low';
}

export function confidenceLabelText(label: AggregatedConfidenceLabel): string {
  if (label === 'high') return 'High confidence';
  if (label === 'medium') return 'Medium confidence';
  return 'Unconfirmed';
}

interface FieldCandidate {
  key: string;
  displayValue: string | string[];
  reportCount: number;
  sourceBreakdown: SourceBreakdown;
  trustScore: number;
  lastUpdated: string;
}

export function getBestFieldValue(candidates: FieldCandidate[]): FieldCandidate | null {
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => {
    if (cur.reportCount > best.reportCount) return cur;
    if (cur.reportCount < best.reportCount) return best;
    if (cur.trustScore > best.trustScore) return cur;
    if (cur.trustScore < best.trustScore) return best;
    return cur.lastUpdated > best.lastUpdated ? cur : best;
  });
}

function trustScoreForBreakdown(breakdown: SourceBreakdown): number {
  return (Object.keys(SOURCE_TRUST_RANK) as ShowReportSourceType[]).reduce(
    (sum, key) => sum + breakdown[key] * SOURCE_TRUST_RANK[key],
    0
  );
}

function aggregateScalarField(
  reports: UserShowReport[],
  pick: (r: UserShowReport) => string | undefined,
  normalize: (v: string) => string | null
): AggregatedField | undefined {
  const groups = new Map<string, FieldCandidate>();

  for (const report of reports) {
    const raw = pick(report);
    if (!raw?.trim()) continue;
    const key = normalize(raw);
    if (!key) continue;

    const existing = groups.get(key);
    const breakdown = existing?.sourceBreakdown ?? EMPTY_BREAKDOWN();
    addSource(breakdown, report.sourceType);

    const candidate: FieldCandidate = {
      key,
      displayValue: key,
      reportCount: (existing?.reportCount ?? 0) + 1,
      sourceBreakdown: breakdown,
      trustScore: 0,
      lastUpdated: report.updatedAt,
    };
    candidate.trustScore = trustScoreForBreakdown(breakdown);
    groups.set(key, candidate);
  }

  const best = getBestFieldValue([...groups.values()]);
  if (!best) return undefined;

  const totalReports = [...groups.values()].reduce((n, g) => n + g.reportCount, 0);
  const confidenceScore = calculateConfidenceScore(
    best.reportCount,
    totalReports,
    best.sourceBreakdown
  );

  return {
    value: best.displayValue,
    reportCount: best.reportCount,
    totalReports,
    confidenceScore,
    confidenceLabel: confidenceLabelFromScore(confidenceScore),
    sourceBreakdown: best.sourceBreakdown,
    lastUpdated: best.lastUpdated,
  };
}

function aggregateOpenerField(reports: UserShowReport[]): AggregatedField | undefined {
  const groups = new Map<string, FieldCandidate>();

  for (const report of reports) {
    const names = report.openerNames;
    if (!names?.length) continue;
    const key = openerListKey(names);
    if (!key) continue;

    const displayNames = names.map((n) => titleCaseName(n.trim()));
    const existing = groups.get(key);
    const breakdown = existing?.sourceBreakdown ?? EMPTY_BREAKDOWN();
    addSource(breakdown, report.sourceType);

    const candidate: FieldCandidate = {
      key,
      displayValue: displayNames,
      reportCount: (existing?.reportCount ?? 0) + 1,
      sourceBreakdown: breakdown,
      trustScore: 0,
      lastUpdated: report.updatedAt,
    };
    candidate.trustScore = trustScoreForBreakdown(breakdown);
    groups.set(key, candidate);
  }

  const best = getBestFieldValue([...groups.values()]);
  if (!best) return undefined;

  const totalReports = [...groups.values()].reduce((n, g) => n + g.reportCount, 0);
  const confidenceScore = calculateConfidenceScore(
    best.reportCount,
    totalReports,
    best.sourceBreakdown
  );

  return {
    value: best.displayValue,
    reportCount: best.reportCount,
    totalReports,
    confidenceScore,
    confidenceLabel: confidenceLabelFromScore(confidenceScore),
    sourceBreakdown: best.sourceBreakdown,
    lastUpdated: best.lastUpdated,
  };
}

export function aggregateShowReports(
  eventId: string,
  reports: UserShowReport[]
): AggregatedShowTiming {
  const eventReports = reports.filter((r) => r.eventId === eventId);

  return {
    eventId,
    doorsOpenTime: aggregateScalarField(
      eventReports,
      (r) => r.doorsOpenTime,
      normalizeTime
    ),
    openerNames: aggregateOpenerField(eventReports),
    openerStartTime: aggregateScalarField(
      eventReports,
      (r) => r.openerStartTime,
      normalizeTime
    ),
    headlinerStartTime: aggregateScalarField(
      eventReports,
      (r) => r.headlinerStartTime,
      normalizeTime
    ),
    endTime: aggregateScalarField(eventReports, (r) => r.endTime, normalizeTime),
  };
}
