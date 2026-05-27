import { cn } from '@/lib/utils';
import { ExternalLink, Ticket } from 'lucide-react';

interface TicketCtaLinkProps {
  href: string;
  className?: string;
}

/** High-contrast ticket link — global `a` styles must not override this. */
export function TicketCtaLink({ href, className }: TicketCtaLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('ticket-cta-link', className)}
    >
      <Ticket className="size-5 shrink-0" aria-hidden />
      <span>Get tickets</span>
      <ExternalLink className="size-4 shrink-0 opacity-90" aria-hidden />
    </a>
  );
}
