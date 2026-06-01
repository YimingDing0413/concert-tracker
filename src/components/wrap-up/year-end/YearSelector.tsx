import { FilterChip } from '@/components/ui/FilterChip';

interface YearSelectorProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

export function YearSelector({ years, value, onChange }: YearSelectorProps) {
  if (years.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Select year">
      {years.map((year) => (
        <FilterChip
          key={year}
          active={year === value}
          onClick={() => onChange(year)}
          aria-selected={year === value}
        >
          {year}
        </FilterChip>
      ))}
    </div>
  );
}
