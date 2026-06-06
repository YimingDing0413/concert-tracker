import { SectionHeader } from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';
import { Camera, ChevronRight, Star, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

const OPTIONS = [
  {
    to: '/create/want',
    title: 'Looking for tickets',
    subtitle: 'Let people know you’re trying to find tickets.',
    icon: Ticket,
    accent: 'from-amber-500/20 to-orange-900/20 text-amber-400',
  },
  {
    to: '/create/review',
    title: 'Review a concert',
    subtitle: 'Share your rating, photos, and recap.',
    icon: Star,
    accent: 'from-violet-500/20 to-fuchsia-900/20 text-violet-300',
  },
  {
    to: '/create/post',
    title: 'Concert post',
    subtitle: 'Post a concert memory, photo, or thought.',
    icon: Camera,
    accent: 'from-primary/20 to-sky-900/20 text-primary',
  },
] as const;

export function CreatePage() {
  return (
    <div className="space-y-8 pb-4">
      <SectionHeader
        title="What do you want to post?"
        subtitle="Pick a post type to get started"
      />

      <ul className="space-y-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <li key={option.to}>
              <Link
                to={option.to}
                className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 no-underline transition-colors hover:border-primary/30 hover:bg-card/80"
              >
                <span
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br',
                    option.accent
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-foreground">
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {option.subtitle}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
