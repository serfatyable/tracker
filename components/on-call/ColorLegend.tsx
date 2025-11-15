'use client';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getStationColors } from '../../lib/on-call/stationColors';
import { stationI18nKeys, stationKeys } from '../../lib/on-call/stations';
import { getLocalStorageItem, setLocalStorageItem, ONCALL_STORAGE_KEYS } from '../../lib/utils/localStorage';

export default function ColorLegend() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(() => {
    // Restore expanded state from localStorage or default to false
    return getLocalStorageItem(ONCALL_STORAGE_KEYS.COLOR_LEGEND_EXPANDED, false);
  });

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    setLocalStorageItem(ONCALL_STORAGE_KEYS.COLOR_LEGEND_EXPANDED, newState);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={isExpanded}
        aria-label={t('onCall.colorLegend', { defaultValue: 'Station Color Legend' })}
      >
        <span className="text-sm font-medium">
          {t('onCall.colorLegend', { defaultValue: 'Color Legend' })}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {stationKeys.map((sk) => {
            const colors = getStationColors(sk);
            return (
              <div key={sk} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border flex-shrink-0`}
                  aria-hidden="true"
                />
                <span className="text-xs truncate">{t(stationI18nKeys[sk])}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
