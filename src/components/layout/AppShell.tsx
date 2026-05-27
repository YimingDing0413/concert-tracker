import { BottomNav } from '@/components/layout/BottomNav';
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
