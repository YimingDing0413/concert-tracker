import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SolidBackButtonProps {
  to: string;
  className?: string;
  label?: string;
}

/** Solid back control — readable on top of photos and gradients. */
export function SolidBackButton({ to, className, label = 'Back' }: SolidBackButtonProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      render={<Link to={to} />}
      className={cn(
        'gap-1.5 border border-border/80 bg-card/95 text-foreground shadow-md backdrop-blur-md hover:bg-card',
        className
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
