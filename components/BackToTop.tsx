'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

type BackToTopProps = {
  threshold?: number;
  ariaLabel?: string;
  className?: string;
};

export function BackToTop({
  threshold = 300,
  ariaLabel = 'Back to top',
  className,
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-16 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full',
        'border border-white/70 bg-white/15 text-[#0b3b85] shadow-[0_10px_36px_rgba(15,61,145,0.24)] transition-all duration-200',
        'backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-[#0b3b85]',
        'hover:shadow-[0_12px_40px_rgba(15,61,145,0.32)] hover:bg-white/25 dark:hover:bg-white/16 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
        isVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-4 opacity-0',
        className,
      )}
    >
      <span className="sr-only">{ariaLabel}</span>
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="h-6 w-6"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 5v14m0-14l-6.5 6.5M12 5l6.5 6.5"
        />
      </svg>
    </button>
  );
}

export default BackToTop;
