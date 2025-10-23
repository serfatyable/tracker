'use client';

import { useTranslation } from 'react-i18next';

type Props = {
  domains: string[];
  active: string | 'all';
  onChange: (domain: string | 'all') => void;
};

export default function TaxonomyChips({ domains, active, onChange }: Props) {
  const { t } = useTranslation();

  if (domains.length === 0) {
    return null;
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide"
      aria-label={t('ui.domains', { defaultValue: 'Domains' }) as string}
    >
      {/* "All domains" option */}
      <button
        type="button"
        className={`pill text-xs whitespace-nowrap ${active === 'all' ? 'ring-1 ring-primary-token' : ''}`}
        onClick={() => onChange('all')}
        aria-pressed={active === 'all'}
        aria-label={`Filter: ${t('ui.domainAll', { defaultValue: 'All domains' })} ${active === 'all' ? 'selected' : 'unselected'}`}
      >
        {t('ui.domainAll', { defaultValue: 'All domains' })}
      </button>

      {/* Individual domain options */}
      {domains.map((domain) => (
        <button
          key={domain}
          type="button"
          className={`pill text-xs whitespace-nowrap ${active === domain ? 'ring-1 ring-primary-token' : ''}`}
          onClick={() => onChange(domain)}
          aria-pressed={active === domain}
          aria-label={`Filter: ${domain} ${active === domain ? 'selected' : 'unselected'}`}
        >
          {domain}
        </button>
      ))}
    </div>
  );
}
