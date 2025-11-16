'use client';
import { useTranslation } from 'react-i18next';

type QuickAction = {
  id: string;
  label: string;
  icon: string;
  description: string;
  gradient: string;
  onClick: () => void;
  shortcut?: string;
};

export default function EnhancedQuickActions({
  onGoRotations,
  onFocusSearch,
  onGoActiveRotation,
  favorites,
}: {
  onGoRotations: () => void;
  onFocusSearch: () => void;
  onGoActiveRotation: () => void;
  favorites: Array<{ id: string; name: string; onSelect: () => void }>;
}) {
  const { t } = useTranslation();

  const actions: QuickAction[] = [
    {
      id: 'log-activity',
      label: t('ui.logActivity', { defaultValue: 'Log Activity' }) as string,
      icon: '✍️',
      description: t('ui.home.actions.logActivityDesc', {
        defaultValue: 'Record your work',
      }) as string,
      gradient: 'from-blue-500 to-sky-500',
      onClick: onGoRotations,
      shortcut: '⌘L',
    },
    {
      id: 'search',
      label: t('ui.searchRotations', { defaultValue: 'Search' }) as string,
      icon: '🔍',
      description: t('ui.home.actions.searchDesc', {
        defaultValue: 'Find tasks quickly',
      }) as string,
      gradient: 'from-purple-500 to-pink-500',
      onClick: onFocusSearch,
      shortcut: '⌘K',
    },
    {
      id: 'active-rotation',
      label: t('ui.goToActiveRotation', { defaultValue: 'Active Rotation' }) as string,
      icon: '🎯',
      description: t('ui.home.actions.activeRotationDesc', {
        defaultValue: 'View current rotation',
      }) as string,
      gradient: 'from-teal-500 to-emerald-500',
      onClick: onGoActiveRotation,
      shortcut: '⌘R',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800/50"
          >
            {/* Gradient background on hover */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 transition-opacity group-hover:opacity-10`}
            />

            <div className="relative z-10">
              {/* Icon */}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-3xl">{action.icon}</div>
                {action.shortcut && (
                  <div className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    {action.shortcut}
                  </div>
                )}
              </div>

              {/* Label and Description */}
              <div className="font-semibold text-gray-900 dark:text-white">{action.label}</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {action.description}
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-3 right-3 text-gray-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 dark:text-gray-600">
              →
            </div>
          </button>
        ))}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="card-levitate rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/30 to-orange-50/30 p-4 dark:border-amber-900/40 dark:from-amber-950/10 dark:to-orange-950/10">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('ui.home.favorites', { defaultValue: 'Quick Access' })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <button
                key={f.id}
                className="group flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition-all hover:scale-105 hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm dark:border-amber-800 dark:bg-gray-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
                onClick={f.onSelect}
              >
                <span className="opacity-70 transition-opacity group-hover:opacity-100">📂</span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
