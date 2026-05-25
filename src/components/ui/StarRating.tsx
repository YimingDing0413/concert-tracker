interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function StarRating({
  value,
  max = 5,
  onChange,
  readonly,
  size = 'md',
  label,
}: StarRatingProps) {
  return (
    <div className={`star-rating star-rating-${size}`} role={readonly ? 'img' : 'group'} aria-label={label}>
      {label && <span className="star-rating-label">{label}</span>}
      <div className="star-rating-stars">
        {Array.from({ length: max }, (_, i) => {
          const star = i + 1;
          const filled = star <= value;
          return (
            <button
              key={star}
              type="button"
              className={`star ${filled ? 'on' : ''}`}
              disabled={readonly || !onChange}
              onClick={() => onChange?.(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}
