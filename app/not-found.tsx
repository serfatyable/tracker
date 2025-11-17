'use client';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh pad-safe-t pad-safe-b flex items-center justify-center p-6">
      <div className="card-levitate p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">{t('errors.pageNotFound')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('errors.pageNotFoundMessage')}
        </p>
      </div>
    </div>
  );
}
