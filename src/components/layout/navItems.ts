import type { LucideIcon } from 'lucide-react';
import { Compass, Gift, Home, Plus, UserRound } from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match path exactly (for `/`). */
  end?: boolean;
  /** Raised center Log control on bottom nav. */
  highlight?: boolean;
  /** Accessible name when different from label. */
  ariaLabel?: string;
};

/** Primary app tabs shared by BottomNav and SidebarNav. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  {
    to: '/log',
    label: 'Log',
    icon: Plus,
    highlight: true,
    ariaLabel: 'Log a show',
  },
  { to: '/wrapped', label: 'Wrapped', icon: Gift },
  { to: '/profile', label: 'Profile', icon: UserRound },
];
