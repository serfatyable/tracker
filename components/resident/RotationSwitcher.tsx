'use client';

import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

import type { RotationMeta } from '../../lib/hooks/useRotationsIndex';

type Props = {
  activeId: string | null;
  onChange: (id: string | null) => void;
  index: {
    all: RotationMeta[];
    mine: RotationMeta[];
    statusById: Record<string, 'not-started' | 'in-progress' | 'completed'>;
  };
  onOpenSheet: () => void;
};

export default function RotationSwitcher({ activeId, onChange, index, onOpenSheet }: Props) {
  const { t } = useTranslation();

  // Show up to 6 of my rotations
  const quickRotations = index.mine.slice(0, 6);

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide"
      aria-label={t('ui.rotations', { defaultValue: 'Rotations' }) as string}
    >
      {/* "All" option */}
      <button
        data-testid="rot-chip-all"
        type="button"
        className={clsx(
          'px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80',
          activeId === null && 'bg-primary text-primary-foreground',
        )}
        onClick={() => onChange(null)}
        aria-pressed={activeId === null}
        aria-label={`Rotation: ${t('ui.allRotations', { defaultValue: 'All rotations' })} ${activeId === null ? 'selected' : 'unselected'}`}
      >
        {t('ui.allRotations', { defaultValue: 'All' })}
      </button>

      {/* Quick rotation options */}
      {quickRotations.map((rotation) => (
        <button
          key={rotation.id}
          data-testid={`rot-chip-${rotation.id}`}
          type="button"
          className={clsx(
            'px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80',
            activeId === rotation.id && 'bg-primary text-primary-foreground',
          )}
          onClick={() => onChange(rotation.id)}
          aria-pressed={activeId === rotation.id}
          aria-label={`Rotation: ${rotation.name} ${activeId === rotation.id ? 'selected' : 'unselected'}`}
        >
          <span className="truncate max-w-[10rem]">{rotation.name}</span>
        </button>
      ))}

      {/* Browse all button */}
      <button
        type="button"
        className="pill text-xs whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={onOpenSheet}
        aria-label={t('ui.browseAll', { defaultValue: 'Browse all rotations' }) as string}
      >
        {t('ui.browseAll', { defaultValue: 'Browse all' })}
      </button>
    </div>
  );
}
