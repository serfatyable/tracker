'use client';

import { Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils/cn';

type FloatingMenuButtonProps = {
  threshold?: number;
};

export default function FloatingMenuButton({ threshold = 200 }: FloatingMenuButtonProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const openMenu = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('tracker:open-drawer'));
  };

  return (
    <button
      type="button"
      aria-label={t('ui.openMenu', { defaultValue: 'Open menu' })}
      onClick={openMenu}
      className={cn(
        'fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full',
        'bg-[rgb(var(--primary))] text-[rgb(var(--primary-ink))] shadow-lg transition-all duration-200',
        'hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
        'md:hidden',
        isVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <span className="sr-only">{t('ui.openMenu', { defaultValue: 'Open menu' })}</span>
      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
