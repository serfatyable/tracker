'use client';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import AppShell from '@/components/layout/AppShell';
import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import ManualEntryCalendar from '@/components/admin/on-call/ManualEntryCalendar';
import Button from '@/components/ui/Button';

export default function ManualOnCallEntryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUserProfile();

  // Redirect non-admins
  if (!isLoading && currentUser?.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  return (
    <AppShell title={t('onCall.manualEntry', { defaultValue: 'Manual On-Call Entry' })}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {t('onCall.manualEntry', { defaultValue: 'Manual On-Call Entry' })}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('onCall.manualEntryPageDescription', {
                  defaultValue:
                    'Manually add or edit on-call assignments by clicking on calendar dates',
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/admin/on-call')}
                variant="outline"
                className="whitespace-nowrap"
              >
                📤 {t('onCall.import.uploadExcel', { defaultValue: 'Upload Excel' })}
              </Button>
              <Button
                onClick={() => router.push('/admin')}
                variant="outline"
                className="whitespace-nowrap"
              >
                ← {t('ui.back', { defaultValue: 'Back' })}
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 card-levitate p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {t('onCall.howToUse', { defaultValue: 'How to Use' })}
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• {t('onCall.instruction1', { defaultValue: 'Click any date to open the editor panel' })}</li>
                <li>• {t('onCall.instruction2', { defaultValue: 'Select residents for each station using the autocomplete fields' })}</li>
                <li>• {t('onCall.instruction3', { defaultValue: 'Use "Copy from date" to duplicate assignments from another day' })}</li>
                <li>• {t('onCall.instruction4', { defaultValue: 'Navigate between days using Previous/Next buttons or keyboard shortcuts (Ctrl+←/→)' })}</li>
                <li>• {t('onCall.instruction5', { defaultValue: 'Save your changes with the Save button or press Ctrl+S' })}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <ManualEntryCalendar />
      </div>
    </AppShell>
  );
}
