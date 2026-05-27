import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Compass, ListMusic, PlusCircle, UserRound } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Search', icon: Compass },
  { to: '/my-concerts', label: 'My Shows', icon: ListMusic },
  { to: '/add', label: 'Add', icon: PlusCircle },
  { to: '/profile', label: 'Profile', icon: UserRound },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} aria-hidden />
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
