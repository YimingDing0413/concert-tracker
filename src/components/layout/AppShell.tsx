import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { useReviewSync } from '@/hooks/useReviewSync';
import { cn } from '@/lib/utils';
import { Outlet, useLocation } from 'react-router-dom';

export function AppShell() {
  useReviewSync();
  const { pathname } = useLocation();
  const isMap = pathname === '/map';
  const isMessages = pathname.startsWith('/messages');
  const isChatThread = /^\/messages\/.+/.test(pathname);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <SidebarNav />
      <div className="flex min-h-dvh flex-1 flex-col">
        <main
          className={cn(
            'mx-auto w-full flex-1',
            isMap || isMessages
              ? 'relative max-w-none p-0'
              : 'max-w-lg px-4 pb-24 pt-5 md:max-w-3xl md:pb-8 md:pt-8 lg:max-w-4xl',
            isMessages && !isChatThread && 'pb-0 md:pb-0'
          )}
        >
          <Outlet />
        </main>
        {!isChatThread && <BottomNav />}
      </div>
    </div>
  );
}
