import type { ProfileContentTab } from '@/components/profile/ProfileContentTabs';
import { cn } from '@/lib/utils';

const TAB_LABELS: Partial<Record<ProfileContentTab, string>> = {
  concerts: 'Been',
  going: 'Going',
  want: 'Wishlist',
};

interface ProfileTabBarProps {
  tab: ProfileContentTab;
  onTabChange: (tab: ProfileContentTab) => void;
  concertCount?: number;
  goingCount?: number;
  wantCount?: number;
  mode?: 'full' | 'concerts-only';
}

export function ProfileTabBar({
  tab,
  onTabChange,
  concertCount = 0,
  goingCount = 0,
  wantCount = 0,
  mode = 'full',
}: ProfileTabBarProps) {
  const tabs: ProfileContentTab[] =
    mode === 'full' ? ['concerts', 'going', 'want'] : ['concerts', 'going'];

  function countFor(t: ProfileContentTab): number | undefined {
    if (t === 'concerts') return concertCount;
    if (t === 'going') return goingCount;
    if (t === 'want') return wantCount;
    return undefined;
  }

  return (
    <nav className="-mx-4 px-4 md:-mx-0 md:px-0" role="tablist" aria-label="Profile content">
      <div className="flex gap-0.5 overflow-x-auto border-b border-[var(--encore-border-subtle)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const count = countFor(t);
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t)}
              className={cn(
                'relative shrink-0 px-3.5 py-3 text-sm font-semibold transition-colors sm:px-4',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              {TAB_LABELS[t] ?? t}
              {count != null && count > 0 && (
                <span className="ml-1 font-mono text-muted-foreground tabular-nums">{count}</span>
              )}
              {active && (
                <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
