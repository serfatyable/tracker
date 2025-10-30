'use client';
import { useEffect, useRef, useState } from 'react';

export default function LargeTitleHeader({
  title,
  subtitle,
  rightSlot,
  collapseOnScroll = true,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  collapseOnScroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!collapseOnScroll) return;
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement.scrollTop;
        setCompact(y > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [collapseOnScroll]);

  return (
    <div
      ref={ref}
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-2 backdrop-blur-md bg-bg/85 supports-[backdrop-filter]:bg-bg/75 border-b border-muted/20"
      aria-live="polite"
    >
      <div className="app-container px-0">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={`transition-all duration-200 ease-out font-bold text-gray-900 dark:text-gray-50 ${compact ? 'text-xl' : 'text-3xl'}`}
            >
              {title}
            </h1>
            {subtitle ? (
              <div
                className={`transition-opacity duration-200 ${compact ? 'opacity-70 text-sm' : 'opacity-80 text-base'} text-gray-500 dark:text-[rgb(var(--muted))]`}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          {rightSlot ? (
            <div className="flex items-center gap-2 flex-shrink-0">{rightSlot}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
