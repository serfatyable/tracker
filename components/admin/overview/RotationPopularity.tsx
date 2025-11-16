'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocalized } from '../../../lib/i18n/getLocalized';
import type { Assignment } from '../../../types/assignments';

type Props = {
  assignments: Assignment[];
  rotations: Array<{ id: string; name: string; nameHe?: string }>;
};

export default function RotationPopularity({ assignments, rotations }: Props): React.ReactElement {
  const { t, i18n } = useTranslation();

  const popularityData = useMemo(() => {
    // Count assignments per rotation
    const counts = new Map<string, number>();
    for (const assignment of assignments) {
      counts.set(assignment.rotationId, (counts.get(assignment.rotationId) || 0) + 1);
    }

    // Get rotation names and counts
    const lang = (i18n.language === 'he' ? 'he' : 'en') as 'en' | 'he';
    const data = rotations
      .map((rotation) => ({
        id: rotation.id,
        name: getLocalized({
          en: rotation.name,
          he: rotation.nameHe,
          lang,
        }) || rotation.name || '',
        count: counts.get(rotation.id) || 0,
      }))
      .filter((r) => r.count > 0) // Only show rotations with active assignments
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 8); // Top 8

    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return data.map((item) => ({
      ...item,
      percentage: maxCount > 0 ? (item.count / maxCount) * 100 : 0,
    }));
  }, [assignments, rotations, i18n.language]);

  if (popularityData.length === 0) {
    return (
      <div className="card-levitate p-6 text-center">
        <p className="text-sm text-foreground/60">
          {t('dashboard.noRotationData', { defaultValue: 'No rotation data available' })}
        </p>
      </div>
    );
  }

  return (
    <div className="card-levitate p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('dashboard.popularRotations', { defaultValue: 'Popular Rotations' })}
      </h3>
      <p className="text-sm text-foreground/60 mb-4">
        {t('dashboard.popularRotationsDesc', {
          defaultValue: 'Rotations with the most active assignments',
        })}
      </p>

      <div className="space-y-3">
        {popularityData.map((rotation, index) => (
          <div key={rotation.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index === 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : index === 1
                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        : index === 2
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-foreground">{rotation.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{rotation.count}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  index === 0
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : index === 1
                      ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                      : index === 2
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                        : 'bg-gradient-to-r from-blue-400 to-blue-500'
                }`}
                style={{ width: `${rotation.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
