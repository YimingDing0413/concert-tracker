import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backTo, action, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 space-y-4', className)}>
      {backTo && <SolidBackButton to={backTo} className="-ml-1" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
