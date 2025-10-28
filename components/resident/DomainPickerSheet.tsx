'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  open: boolean;
  onClose: () => void;
  domains: string[];
  active: string | 'all';
  onSelect: (domain: string | 'all') => void;
  domainCounts?: Record<string, number>;
};

export default function DomainPickerSheet({
  open,
  onClose,
  domains,
  active,
  onSelect,
  domainCounts,
}: Props) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  // Get recent domains from localStorage
  const [recentDomains, setRecentDomains] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent-domains');
      if (stored) {
        setRecentDomains(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const updateRecentDomains = (domain: string) => {
    if (domain === 'all') return;

    const newRecent = [domain, ...recentDomains.filter((d) => d !== domain)].slice(0, 5);
    setRecentDomains(newRecent);
    try {
      localStorage.setItem('recent-domains', JSON.stringify(newRecent));
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleSelect = (domain: string | 'all') => {
    updateRecentDomains(domain);
    onSelect(domain);
    onClose();
  };

  const filteredDomains = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return domains;
    return domains.filter((domain) => domain.toLowerCase().includes(term));
  }, [domains, searchTerm]);

  const sortedDomains = useMemo(() => {
    const recent = recentDomains.filter((d) => domains.includes(d));
    const others = filteredDomains.filter((d) => !recent.includes(d));
    return { recent, others };
  }, [filteredDomains, recentDomains, domains]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 sheet-max-h grid grid-rows-[auto,auto,1fr] overflow-hidden pointer-events-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Row 1: Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('ui.allDomains', { defaultValue: 'All domains' })}
          </div>
        </div>

        {/* Row 2: Search input */}
        <div className="px-4 pb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('ui.searchDomains', { defaultValue: 'Search domains...' })}
            className="input-levitate w-full"
            aria-label={t('ui.searchDomains', { defaultValue: 'Search domains...' })}
          />
        </div>

        {/* Row 3: Scrollable list area */}
        <div
          className="min-h-0 scroll-y-touch overflow-y-auto scrollbar-stable pb-safe px-2"
          role="region"
          aria-label={t('ui.allDomains', { defaultValue: 'All domains' })}
        >
          {/* "All domains" option */}
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={`w-full text-left px-2 py-3 rounded-lg hover:bg-muted/50 ${
              active === 'all'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'text-gray-900 dark:text-gray-100'
            }`}
            aria-label={`${t('ui.allDomains', { defaultValue: 'All domains' })}, ${active === 'all' ? 'selected' : 'unselected'}`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">
                {t('ui.allDomains', { defaultValue: 'All domains' })}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {domains.length}
              </span>
            </div>
          </button>

          {/* Recent domains section */}
          {sortedDomains.recent.length > 0 && (
            <>
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-2 py-1 text-xs font-medium text-muted-foreground dark:bg-gray-900/90">
                {t('ui.recent', { defaultValue: 'Recent' })}
              </div>
              <ul role="list" className="px-1">
                {sortedDomains.recent.map((domain) => (
                  <li key={domain}>
                    <button
                      type="button"
                      onClick={() => handleSelect(domain)}
                      className={`w-full text-left px-3 py-3 rounded-lg hover:bg-muted/50 ${
                        active === domain
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                      aria-label={`${domain}, ${active === domain ? 'selected' : 'unselected'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{domain}</span>
                        {domainCounts?.[domain] && (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {domainCounts[domain]}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* All domains section */}
          {sortedDomains.others.length > 0 && (
            <>
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-2 py-1 text-xs font-medium text-muted-foreground dark:bg-gray-900/90">
                {t('ui.allDomains', { defaultValue: 'All domains' })}
              </div>
              <ul role="list" className="px-1">
                {sortedDomains.others.map((domain) => (
                  <li key={domain}>
                    <button
                      type="button"
                      onClick={() => handleSelect(domain)}
                      className={`w-full text-left px-3 py-3 rounded-lg hover:bg-muted/50 ${
                        active === domain
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                      aria-label={`${domain}, ${active === domain ? 'selected' : 'unselected'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{domain}</span>
                        {domainCounts?.[domain] && (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {domainCounts[domain]}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* No results */}
          {filteredDomains.length === 0 && searchTerm && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              {t('ui.noResults', { defaultValue: 'No domains found' })}
            </div>
          )}

          {/* Add a small spacer so last item isn't hidden by the curve */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
