import { cn } from '@/lib/utils';
import type { YearEndTemplateId } from '@/types/concertReview';
import { LayoutTemplate, Ticket, Type } from 'lucide-react';

const OPTIONS: { id: YearEndTemplateId; label: string; icon: typeof Ticket }[] = [
  { id: 'tickets', label: 'Ticket stack', icon: Ticket },
  { id: 'poster', label: 'Poster', icon: Type },
  { id: 'minimal', label: 'Minimal', icon: LayoutTemplate },
];

interface YearEndTemplateSelectorProps {
  value: YearEndTemplateId;
  onChange: (value: YearEndTemplateId) => void;
}

export function YearEndTemplateSelector({ value, onChange }: YearEndTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-2 rounded-[14px] border p-4 text-center text-xs font-semibold transition-colors',
              active
                ? 'border-primary/70 bg-primary/15 text-foreground'
                : 'border-border/60 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
