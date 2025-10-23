'use client';

import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';

type Props = {
  rotationId: string | null;
  onOpenDomainPicker: () => void;
};

export default function RotationResources({ rotationId, onOpenDomainPicker }: Props) {
  const { t } = useTranslation();

  // TODO: Get actual resources from props or context
  const resources: Array<{ title: string; url: string; description?: string }> = [];

  if (!rotationId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('ui.selectRotation', { defaultValue: 'Select a rotation to view resources' })}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('ui.noResources', { defaultValue: 'No resources yet' })}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {t('ui.noResourcesDescription', {
            defaultValue: 'Resources will appear here when available for this rotation.',
          })}
        </p>
        <Button onClick={onOpenDomainPicker}>
          {t('ui.openDomainPicker', { defaultValue: 'Open domain picker' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('ui.resources', { defaultValue: 'Resources' })}
        </h2>
        <Button variant="outline" size="sm" onClick={onOpenDomainPicker}>
          {t('ui.browseDomains', { defaultValue: 'Browse domains' })}
        </Button>
      </div>

      <div className="space-y-3">
        {resources.map((resource, index) => (
          <a
            key={index}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              {resource.title}
            </div>
            {resource.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {resource.description}
              </div>
            )}
            <div className="text-xs text-blue-600 dark:text-blue-400 truncate">{resource.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
