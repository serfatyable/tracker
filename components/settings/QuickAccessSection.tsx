'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateUserQuickAccessTabs } from '@/lib/firebase/auth';
import { queryKeys } from '@/lib/react-query/keys';
import type { UserProfile } from '@/types/auth';

interface QuickAccessSectionProps {
  profile: UserProfile;
  onToast: (message: string) => void;
}

// Default tabs for new users: On Call, Morning Meetings, Rotations
const DEFAULT_TABS = {
  resident: ['resident-on-call', 'resident-meetings', 'resident-rotations'],
  tutor: ['tutor-on-call', 'tutor-meetings', 'tutor-rotations'],
  admin: ['admin-on-call', 'admin-meetings', 'admin-rotations'],
};

// All available tabs per role
const ALL_TABS = {
  resident: [
    'resident-home',
    'resident-reflections',
    'resident-rotations',
    'resident-exams',
    'resident-on-call',
    'resident-meetings',
    'resident-settings',
    'global-search',
  ],
  tutor: [
    'tutor-home',
    'tutor-residents',
    'tutor-tasks',
    'tutor-reflections',
    'tutor-rotations',
    'tutor-on-call',
    'tutor-meetings',
    'tutor-exams',
    'tutor-settings',
    'global-search',
  ],
  admin: [
    'admin-home',
    'admin-tasks',
    'admin-reflections',
    'admin-rotations',
    'admin-on-call',
    'admin-meetings',
    'admin-exams',
    'admin-users',
    'admin-settings',
    'global-search',
  ],
};

// Tab labels (matching RoleTabs)
const TAB_LABELS: Record<string, string> = {
  'resident-home': 'ui.homeTitle',
  'resident-reflections': 'ui.reflections',
  'resident-rotations': 'ui.rotations',
  'resident-exams': 'exams.title',
  'resident-on-call': 'ui.onCall',
  'resident-meetings': 'ui.morningMeetings',
  'resident-settings': 'ui.settings',
  'tutor-home': 'ui.homeTitle',
  'tutor-residents': 'tutor.tabs.residents',
  'tutor-tasks': 'ui.tasks',
  'tutor-reflections': 'ui.reflections',
  'tutor-rotations': 'ui.rotations',
  'tutor-on-call': 'ui.onCall',
  'tutor-meetings': 'ui.morningMeetings',
  'tutor-exams': 'exams.title',
  'tutor-settings': 'ui.settings',
  'admin-home': 'ui.homeTitle',
  'admin-tasks': 'ui.tasks',
  'admin-reflections': 'ui.reflections',
  'admin-rotations': 'ui.rotations',
  'admin-on-call': 'ui.onCall',
  'admin-meetings': 'ui.morningMeetings',
  'admin-exams': 'exams.title',
  'admin-users': 'ui.userManagement',
  'admin-settings': 'ui.settings',
  'global-search': 'ui.search',
};

export default function QuickAccessSection({ profile, onToast }: QuickAccessSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const role = profile.role;
  const availableTabs = ALL_TABS[role];

  // Initialize with user's saved tabs, or default tabs, or all tabs
  const [selectedTabs, setSelectedTabs] = useState<string[]>(() => {
    if (profile.settings?.quickAccessTabs) {
      return profile.settings.quickAccessTabs;
    }
    return DEFAULT_TABS[role];
  });

  useEffect(() => {
    if (profile.settings?.quickAccessTabs) {
      setSelectedTabs(profile.settings.quickAccessTabs);
    } else {
      setSelectedTabs(DEFAULT_TABS[role]);
    }
  }, [profile.settings?.quickAccessTabs, role]);

  const handleToggle = (tabId: string) => {
    setSelectedTabs((prev) => {
      if (prev.includes(tabId)) {
        return prev.filter((id) => id !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedTabs(availableTabs);
  };

  const handleClearAll = () => {
    setSelectedTabs([]);
  };

  const handleReset = () => {
    setSelectedTabs(DEFAULT_TABS[role]);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await updateUserQuickAccessTabs(selectedTabs);
      queryClient.setQueryData(queryKeys.users.currentProfile(), (existing: UserProfile | null) => {
        if (!existing) {
          return existing;
        }

        return {
          ...existing,
          settings: {
            ...(existing.settings ?? {}),
            quickAccessTabs: selectedTabs,
          },
        } satisfies UserProfile;
      });
      onToast(t('settings.saved'));
    } catch {
      onToast(t('settings.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {t('settings.quickAccess.title', { defaultValue: 'Quick Access Tabs' })}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('settings.quickAccess.description', {
          defaultValue: 'Customize which pages appear in your navigation tabs.',
        })}
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {t('settings.quickAccess.selectAll', { defaultValue: 'Select All' })}
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {t('settings.quickAccess.clearAll', { defaultValue: 'Clear All' })}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {t('settings.quickAccess.reset', { defaultValue: 'Reset to Default' })}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {availableTabs.map((tabId) => (
          <label
            key={tabId}
            className="inline-flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedTabs.includes(tabId)}
              onChange={() => handleToggle(tabId)}
              className="rounded"
            />
            <span>
              {t(TAB_LABELS[tabId] || 'ui.homeTitle', {
                defaultValue: tabId.split('-').slice(1).join(' '),
              })}
            </span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
      >
        {t('settings.save', { defaultValue: 'Save' })}
      </button>
    </form>
  );
}
