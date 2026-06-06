import type { ProfileContentTab } from '@/components/profile/ProfileContentTabs';
import { cn } from '@/lib/utils';

const TAB_LABELS: Record<ProfileContentTab, string> = {
  concerts: 'Concerts',
  going: 'Going',
  reviews: 'Reviews',
  posts: 'Posts',
  wrapped: 'Wrap-Ups',
};

interface ProfileTabBarProps {
  tab: ProfileContentTab;
  onTabChange: (tab: ProfileContentTab) => void;
  concertCount?: number;
  goingCount?: number;
  reviewCount?: number;
  postCount?: number;
  mode?: 'full' | 'concerts-only';
}

export function ProfileTabBar({
  tab,
  onTabChange,
  concertCount = 0,
  goingCount = 0,
  reviewCount = 0,
  postCount = 0,
  mode = 'full',
}: ProfileTabBarProps) {
  const tabs: ProfileContentTab[] =
    mode === 'full'
      ? ['concerts', 'going', 'reviews', 'posts', 'wrapped']
      : ['concerts', 'going'];

  function countFor(t: ProfileContentTab): number | undefined {
    if (t === 'concerts') return concertCount;
    if (t === 'going') return goingCount;
    if (t === 'reviews') return reviewCount;
    if (t === 'posts') return postCount;
    return undefined;
  }

  return (
    <nav
      className="-mx-4 border-b border-border/50 px-4 md:-mx-0 md:px-0"
      role="tablist"
      aria-label="Profile content"
    >
      <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                'relative shrink-0 px-4 py-3.5 text-sm font-semibold transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              {TAB_LABELS[t]}
              {count != null && count > 0 && (
                <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
              )}
              {active && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
