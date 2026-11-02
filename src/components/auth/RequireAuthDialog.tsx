import { Button } from '@/components/ui/app-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { loginPathWithNext, signupPathWithNext } from '@/lib/auth/nextPath';
import { Link } from 'react-router-dom';

interface RequireAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string;
  title?: string;
  description?: string;
}

export function RequireAuthDialog({
  open,
  onOpenChange,
  next,
  title = 'Create an account to save this',
  description = 'Sign up or log in to log shows, mark “I was there,” and keep your year in sync.',
}: RequireAuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm space-y-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button fullWidth render={<Link to={signupPathWithNext(next)} />}>
            Sign up
          </Button>
          <Button fullWidth variant="secondary" render={<Link to={loginPathWithNext(next)} />}>
            Log in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
