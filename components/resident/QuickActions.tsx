'use client';
import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';

export default function QuickActions({
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
  return (
    <div className="card-levitate rounded border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="btn-levitate text-primary border-primary/40"
          onClick={onGoRotations}
        >
          {t('ui.logActivity') || 'Log activity'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="btn-levitate text-primary border-primary/40"
          onClick={onFocusSearch}
        >
          {t('ui.searchRotations') || 'Search'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="btn-levitate text-primary border-primary/40"
          onClick={onGoActiveRotation}
        >
          {t('ui.goToActiveRotation') || 'Go to active rotation'}
        </Button>
      </div>
      {favorites.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {favorites.map((f) => (
            <button
              key={f.id}
              className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              onClick={f.onSelect}
            >
              {f.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
