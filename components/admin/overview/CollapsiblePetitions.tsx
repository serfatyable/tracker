'use client';

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import PetitionsTable from './PetitionsTable';

type Props = {
  initialExpanded?: boolean;
};

export default function CollapsiblePetitions({
  initialExpanded = false,
}: Props): React.ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('dashboard.rotationPetitions', { defaultValue: 'Rotation Petitions' })}
          </h2>
          <p className="text-sm text-foreground/60 mt-1">
            {t('dashboard.rotationPetitionsDesc', {
              defaultValue: 'Review and approve rotation activation and completion requests',
            })}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-expanded={expanded}
        >
          <span className="text-sm font-medium">
            {expanded
              ? t('dashboard.collapse', { defaultValue: 'Collapse' })
              : t('dashboard.expand', { defaultValue: 'Expand' })}
          </span>
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Collapsible content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          expanded
            ? 'opacity-100 max-h-[2000px]'
            : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
        }`}
      >
        <div className="card-levitate p-4">
          <PetitionsTable />
        </div>
      </div>

      {/* Collapsed state preview */}
      {!expanded && (
        <div
          className="card-levitate p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground/70">
              {t('dashboard.clickToReviewPetitions', {
                defaultValue: 'Click to review pending rotation petitions',
              })}
            </div>
            <div className="flex items-center gap-2 text-primary">
              <span className="text-sm font-medium">
                {t('dashboard.viewAll', { defaultValue: 'View all' })}
              </span>
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
