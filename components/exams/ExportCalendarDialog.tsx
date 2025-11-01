import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import { haptic } from '@/lib/utils/haptics';

interface ExportCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportCalendarDialog({ isOpen, onClose }: ExportCalendarDialogProps) {
  const { t, i18n } = useTranslation();

  const handleExport = (upcomingOnly: boolean) => {
    haptic('light');
    const lang = i18n.language === 'he' ? 'he' : 'en';
    const url = `/api/ics/exams?lang=${lang}&upcoming=${upcomingOnly}`;
    window.open(url, '_blank');
    setTimeout(() => {
      haptic('success');
      onClose();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('exams.export.description')}</p>

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
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('exams.filters.all')}</div>
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
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('exams.filters.upcoming')}</div>
                  </div>
                </div>
                <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 dark:text-gray-400">💡 {t('exams.export.downloadICS')}</p>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
