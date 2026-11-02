import { cn } from '@/lib/utils';
import { Compass, Plus, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Discover', icon: Compass, end: true },
  { to: '/log', label: 'Log', icon: Plus, end: false, highlight: true },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isLog = 'highlight' in tab && tab.highlight;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              aria-label={isLog ? 'Log a show' : tab.label}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.62rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-11 items-center justify-center rounded-full transition-colors',
                      isLog && 'bg-primary text-primary-foreground shadow-md shadow-primary/30',
                      !isLog && isActive && 'bg-primary/15',
                      isLog && isActive && 'ring-2 ring-primary/40'
                    )}
                  >
                    <Icon
                      className={cn('size-4', isActive && !isLog && 'stroke-[2.5]')}
                      aria-hidden
                    />
                  </span>
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
