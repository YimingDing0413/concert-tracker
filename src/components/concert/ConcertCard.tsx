import { CompactConcertRow } from '@/components/cards/CompactConcertRow';
import { ConcertPosterCard } from '@/components/cards/ConcertPosterCard';
import type { ConcertCardBadgeType } from '@/components/cards/ConcertCardBadge';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import type { ReactNode } from 'react';

interface ConcertCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  variant?: 'poster' | 'compact' | 'memory';
  showCta?: boolean;
  badge?: ConcertCardBadgeType;
  featured?: boolean;
  /** @deprecated No longer shown */
  showSource?: boolean;
  footer?: ReactNode;
  /** @deprecated Use footer */
  action?: ReactNode;
}

export function ConcertCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  variant = 'poster',
  showCta = true,
  badge,
  featured,
  footer,
  action,
}: ConcertCardProps) {
  const cardFooter = footer ?? action;

  if (variant === 'compact') {
    return (
      <CompactConcertRow
        concert={concert}
        userConcert={userConcert}
        rating={rating}
        concertId={concertId}
        backTo={backTo}
        badge={badge}
      />
    );
  }

  return (
    <ConcertPosterCard
      concert={concert}
      userConcert={userConcert}
      rating={rating}
      concertId={concertId}
      backTo={backTo}
      showCta={showCta && variant === 'poster'}
      footer={cardFooter}
      badge={badge}
      featured={featured}
      width="full"
    />
  );
}
