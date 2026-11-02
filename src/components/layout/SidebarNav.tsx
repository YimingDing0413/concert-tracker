import { Button } from '@/components/ui/app-button';
import { NAV_ITEMS } from '@/components/layout/navItems';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

export function SidebarNav() {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const sideItems = NAV_ITEMS.filter((item) => !item.highlight);

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-card/30 px-3 py-6 md:flex lg:w-64">
      <Link to="/" className="logo mb-6 px-3 text-2xl no-underline">
        Encore
      </Link>
      <Button
        fullWidth
        className="mb-4 min-h-11 gap-2"
        aria-label="Log a show"
        onClick={() => {
          if (user) {
            navigate('/log');
            return;
          }
          requireAuth(() => navigate('/log'), { next: '/log' });
        }}
      >
        <Plus className="size-4" aria-hidden />
        Log a show
      </Button>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
        {sideItems.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
      <p className="px-3 text-xs text-muted-foreground">Log shows. Rate nights. Share your year.</p>
    </aside>
  );
}
