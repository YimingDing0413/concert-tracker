/** Shared Encore UI class fragments — keeps card variants consistent. */

export const encore = {
  posterShell:
    'group relative overflow-hidden rounded-2xl bg-surface-2 transition-transform duration-300 hover:scale-[1.01]',
  feedPost:
    'border-b border-[var(--encore-border-subtle)] pb-6 last:border-0 last:pb-0',
  sectionLabel: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  pill:
    'inline-flex items-center gap-1.5 rounded-full bg-[var(--encore-surface-2)] px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--encore-surface-3)]',
} as const;
