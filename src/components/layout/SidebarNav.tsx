import { cn } from '@/lib/utils';
import { Compass, MapPinned, Search, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Discover', icon: Compass, end: true },
  { to: '/search', label: 'Search', icon: Search, end: false },
  { to: '/map', label: 'Map', icon: MapPinned, end: false },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false },
] as const;

export function SidebarNav() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-card/30 px-3 py-6 md:flex lg:w-64">
      <span className="logo mb-8 px-3 text-2xl">Encore</span>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )
              }
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
      <p className="px-3 text-xs text-muted-foreground">Track shows. Rate nights. Find your next gig.</p>
    </aside>
  );
}
