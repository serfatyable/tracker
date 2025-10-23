'use client';

import { useTranslation } from 'react-i18next';

type Tab = 'overview' | 'items' | 'resources' | 'activity';

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export default function SegmentedView({ activeTab, onTabChange }: Props) {
  const { t } = useTranslation();

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: t('ui.viewOverview', { defaultValue: 'Overview' }) },
    { key: 'items', label: t('ui.viewItems', { defaultValue: 'Items' }) },
    { key: 'resources', label: t('ui.viewResources', { defaultValue: 'Resources' }) },
    { key: 'activity', label: t('ui.viewActivity', { defaultValue: 'Activity' }) },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, tab: Tab) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentIndex = tabs.findIndex((t) => t.key === tab);
      const nextIndex =
        e.key === 'ArrowLeft'
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : (currentIndex + 1) % tabs.length;
      onTabChange(tabs[nextIndex]!.key);
    }
  };

  return (
    <div
      role="tablist"
      className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1"
      aria-label={t('ui.viewTabs', { defaultValue: 'View tabs' })}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={`${tab.key}-panel`}
          id={`${tab.key}-tab`}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.key
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          onClick={() => onTabChange(tab.key)}
          onKeyDown={(e) => handleKeyDown(e, tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
