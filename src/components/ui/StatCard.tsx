import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon: Icon, className, onClick }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 p-4 text-left shadow-sm backdrop-blur-sm',
        onClick && 'cursor-pointer transition-colors hover:border-primary/40 hover:bg-card',
        className
      )}
    >
      {Icon && (
        <Icon className="mb-2 size-4 text-primary" aria-hidden />
      )}
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </Tag>
  );
}
