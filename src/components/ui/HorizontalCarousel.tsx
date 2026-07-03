import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface HorizontalCarouselProps {
  children: ReactNode;
  className?: string;
  /** Pixels to scroll per arrow click */
  scrollAmount?: number;
}

export function HorizontalCarousel({
  children,
  className,
  scrollAmount = 280,
}: HorizontalCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [children, updateScrollState]);

  function scroll(direction: 'left' | 'right') {
    ref.current?.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2/95 text-foreground shadow-lg ring-1 ring-[var(--encore-border-subtle)] backdrop-blur-sm transition-opacity hover:bg-surface-3"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2/95 text-foreground shadow-lg ring-1 ring-[var(--encore-border-subtle)] backdrop-blur-sm transition-opacity hover:bg-surface-3"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
      <div
        ref={ref}
        className={cn(
          'carousel-scroll px-1',
          (canScrollLeft || canScrollRight) && 'px-10',
          className
        )}
        onScroll={updateScrollState}
      >
        {children}
      </div>
    </div>
  );
}
