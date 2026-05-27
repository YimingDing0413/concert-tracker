import { Button as ShadButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type AppVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantMap: Record<AppVariant, ComponentProps<typeof ShadButton>['variant']> = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'destructive',
};

interface AppButtonProps extends Omit<ComponentProps<typeof ShadButton>, 'variant'> {
  variant?: AppVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  className,
  size = 'default',
  ...props
}: AppButtonProps) {
  return (
    <ShadButton
      variant={variantMap[variant]}
      size={size}
      className={cn(fullWidth && 'w-full', className)}
      {...props}
    />
  );
}
