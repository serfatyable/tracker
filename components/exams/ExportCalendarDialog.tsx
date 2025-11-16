import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Toast from '@/components/ui/Toast';
import { getFirebaseApp } from '@/lib/firebase/client';
import { haptic } from '@/lib/utils/haptics';
import { logger } from '@/lib/utils/logger';

interface ExportCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportCalendarDialog({ isOpen, onClose }: ExportCalendarDialogProps) {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleDialogClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleExport = useCallback(
    async (upcomingOnly: boolean) => {
      const auth = getAuth(getFirebaseApp());
      const user = auth.currentUser;

      if (!user) {
        haptic('error');
        setError(
          (t('auth.signInRequired', {
            defaultValue: 'Please sign in to download your calendar.',
          }) as string) || 'Please sign in to download your calendar.',
        );
        return;
      }

      setError(null);
      haptic('light');

      const lang = i18n.language === 'he' ? 'he' : 'en';
      const url = `/api/ics/exams?lang=${lang}&upcoming=${upcomingOnly}`;
      let downloadUrl: string | null = null;

      try {
        const token = await user.getIdToken();
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let message =
            (t('exams.export.error', {
              defaultValue: 'Failed to export exams calendar.',
            }) as string) || 'Failed to export exams calendar.';

          try {
            const data = await response.json();
            if (data && typeof data.error === 'string') {
              message = data.error;
            }
          } catch (jsonError) {
            logger.warn(
              'Failed to parse error response for exams ICS download',
              'export-calendar',
              jsonError,
            );
          }

          throw new Error(message);
        }

        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = upcomingOnly ? `exams-${lang}-upcoming.ics` : `exams-${lang}.ics`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        haptic('success');
        handleDialogClose();
      } catch (err) {
        logger.error('Failed to download exams ICS', 'export-calendar', err as Error);
        haptic('error');
        const fallback =
          (t('exams.export.error', {
            defaultValue: 'Failed to export exams calendar.',
          }) as string) || 'Failed to export exams calendar.';
        setError(err instanceof Error && err.message ? err.message : fallback);
      } finally {
        if (downloadUrl) {
          URL.revokeObjectURL(downloadUrl);
        }
      }
    },
    [handleDialogClose, i18n.language, t],
  );

  return (
    <>
      <Dialog open={isOpen} onClose={handleDialogClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <Dialog.Title className="text-lg font-semibold">
                  {t('exams.export.title')}
                </Dialog.Title>
              </div>
              <button
                onClick={handleDialogClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('exams.export.description')}
              </p>

              <div className="space-y-3">
                {/* All Exams */}
                <button
                  onClick={() => handleExport(false)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{t('exams.export.allExams')}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('exams.filters.all')}
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </button>

                {/* Upcoming Only */}
                <button
                  onClick={() => handleExport(true)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {t('exams.export.upcomingOnly')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('exams.filters.upcoming')}
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </button>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 {t('exams.export.downloadICS')}
                </p>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
      <Toast message={error} variant="error" onClear={() => setError(null)} />
    </>
  );
}
