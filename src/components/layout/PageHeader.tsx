import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
      {backTo && (
        <Button variant="ghost" size="sm" render={<Link to={backTo} />} className="-ml-2 gap-1 px-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      )}
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
