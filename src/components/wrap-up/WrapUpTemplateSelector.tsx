import { cn } from '@/lib/utils';
import type { WrapUpTemplateId } from '@/types/concertReview';
import { Image, LayoutGrid, BarChart3 } from 'lucide-react';

const TEMPLATES: {
  id: WrapUpTemplateId;
  name: string;
  description: string;
  icon: typeof Image;
}[] = [
  { id: 'poster', name: 'Poster', description: 'Big photo + bold artist', icon: Image },
  { id: 'stats', name: 'Stats', description: 'Ratings breakdown', icon: BarChart3 },
  { id: 'collage', name: 'Collage', description: 'Photo grid recap', icon: LayoutGrid },
];

interface WrapUpTemplateSelectorProps {
  value: WrapUpTemplateId;
  onChange: (id: WrapUpTemplateId) => void;
}

export function WrapUpTemplateSelector({ value, onChange }: WrapUpTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TEMPLATES.map(({ id, name, description, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all',
            value === id
              ? 'border-primary bg-primary/15 shadow-[0_0_20px_-4px] shadow-primary/40'
              : 'border-border/60 bg-card/60 hover:border-primary/30'
          )}
        >
          <Icon className="size-5 text-primary" />
          <span className="text-xs font-bold">{name}</span>
          <span className="text-[10px] leading-tight text-muted-foreground">{description}</span>
        </button>
      ))}
    </div>
  );
}
