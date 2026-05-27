import { FilterChip } from '@/components/ui/FilterChip';
import { REVIEW_MOOD_TAGS } from '@/types/concertReview';

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}

export function TagSelector({ selected, onChange, max = 6 }: TagSelectorProps) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, tag]);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Pick up to {max} tags {selected.length > 0 && `(${selected.length}/${max})`}
      </p>
      <div className="flex flex-wrap gap-2">
        {REVIEW_MOOD_TAGS.map((tag) => (
          <FilterChip
            key={tag}
            active={selected.includes(tag)}
            onClick={() => toggle(tag)}
            className="h-auto min-h-8 px-3 py-1.5 text-[11px] capitalize"
          >
            {tag}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
