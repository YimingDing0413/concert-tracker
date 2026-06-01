import { cn } from '@/lib/utils';
import type { YearEndTemplateId } from '@/types/concertReview';
import { Images, LayoutGrid, Sticker } from 'lucide-react';

const OPTIONS: { id: YearEndTemplateId; label: string; icon: typeof Images }[] = [
  { id: 'collage', label: 'Photo collage', icon: Images },
  { id: 'stats', label: 'Wrapped stats', icon: LayoutGrid },
  { id: 'scrapbook', label: 'Scrapbook', icon: Sticker },
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
              'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-xs font-semibold transition-colors',
              active
                ? 'border-primary/60 bg-primary/15 text-foreground shadow-[0_0_16px_-4px] shadow-primary/50'
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
