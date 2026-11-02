import { NAV_ITEMS } from '@/components/layout/navItems';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import { NavLink, useNavigate } from 'react-router-dom';

export function BottomNav() {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-lg items-end px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isLog = Boolean(tab.highlight);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              aria-label={tab.ariaLabel ?? tab.label}
              onClick={(e) => {
                if (!isLog || user) return;
                e.preventDefault();
                requireAuth(() => navigate('/log'), { next: '/log' });
              }}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-end gap-0.5 pb-2 text-[0.62rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && !isLog ? 'text-primary' : 'text-muted-foreground',
                  isLog && 'text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex items-center justify-center transition-colors',
                      isLog
                        ? '-mt-5 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35'
                        : cn('size-11 rounded-full', isActive && 'bg-primary/15'),
                      isLog && isActive && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                    )}
                  >
                    <Icon
                      className={cn(isLog ? 'size-6' : 'size-4', isActive && !isLog && 'stroke-[2.5]')}
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
