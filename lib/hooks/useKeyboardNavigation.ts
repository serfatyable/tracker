import { useEffect, useCallback } from 'react';

/**
 * Hook for handling keyboard navigation on the on-call page
 */
export function useKeyboardNavigation(options: {
  onTabChange: (tab: 'my' | 'today' | 'team' | 'timeline') => void;
  currentTab: 'my' | 'today' | 'team' | 'timeline';
  enabled?: boolean;
}) {
  const { onTabChange, currentTab, enabled = true } = options;

  const tabs: Array<'my' | 'today' | 'team' | 'timeline'> = ['my', 'today', 'team', 'timeline'];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const currentIndex = tabs.indexOf(currentTab);

      // Arrow key navigation
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        onTabChange(tabs[prevIndex]);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        onTabChange(tabs[nextIndex]);
      }

      // Number key shortcuts (1-4)
      if (event.key >= '1' && event.key <= '4') {
        event.preventDefault();
        const tabIndex = parseInt(event.key, 10) - 1;
        if (tabIndex < tabs.length) {
          onTabChange(tabs[tabIndex]);
        }
      }
    },
    [currentTab, onTabChange, tabs]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
