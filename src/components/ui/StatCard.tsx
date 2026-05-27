import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      {Icon && (
        <Icon className="mb-2 size-4 text-primary" aria-hidden />
      )}
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
