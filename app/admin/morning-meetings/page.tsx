'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  PreviewRow,
  ValidationError,
} from '../../../components/admin/morning-meetings/ImportPreviewDialog';
import TopBar from '../../../components/TopBar';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';
import { getCurrentUserWithProfile } from '../../../lib/firebase/auth';
import { parseMorningMeetingsExcel } from '../../../lib/morning-meetings/excel';
import { logger } from '../../../lib/utils/logger';

const ImportPreviewDialog = dynamic(
  () => import('../../../components/admin/morning-meetings/ImportPreviewDialog'),
  { ssr: false },
);

export default function AdminMorningMeetingsImportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { firebaseUser, profile } = await getCurrentUserWithProfile();
        if (!firebaseUser) return router.replace('/auth');
        if (profile?.status === 'pending') return router.replace('/awaiting-approval');
        if (profile && profile.role !== 'admin') return router.replace('/auth');
      } catch (error) {
        logger.error(
          'Failed to check user profile',
          'admin/morning-meetings',
          error instanceof Error ? error : new Error(String(error)),
        );
        router.replace('/auth');
      }
    })();
  }, [router]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Parse file for preview
    try {
      const buffer = await file.arrayBuffer();
      const { rows, errors } = parseMorningMeetingsExcel(buffer);

      // Convert to preview format
      const previewData: PreviewRow[] = rows.map((row, idx) => ({
        rowNumber: idx + 2, // +1 for header, +1 for 1-based
        dayOfWeek: row.dayOfWeek,
        date: row.date,
        title: row.title,
        lecturer: row.lecturer || '',
        moderator: row.moderator || '',
        organizer: row.organizer || '',
        link: row.link,
        notes: row.notes,
      }));

      setPreviewRows(previewData);
      setValidationErrors(errors);
      setShowPreview(true);
    } catch {
      setToast(t('morningMeetings.import.parseError'));
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const buffer = await selectedFile.arrayBuffer();

      // ✅ SECURE: Use authenticated fetch with Bearer token
      const { fetchWithAuth } = await import('../../../lib/api/client');
      const res = await fetchWithAuth('/api/morning-meetings/import', {
        method: 'POST',
        headers: {
          'content-type': 'application/octet-stream',
        },
        body: buffer,
      });

      const data = await res.json();

      if (!res.ok) {
        // Translate error codes from API
        const translateError = (errorMsg: string) => {
          // Check if it's a structured error code (e.g., "INVALID_DAY:3:value")
          const parts = errorMsg.split(':');
          const errorCode = parts[0];

          // Try to translate the error code
          const translationKey = `api.errors.${errorCode}`;
          const translated = t(translationKey, { defaultValue: errorMsg });

          // If there's row info, append it
          if (parts.length > 1) {
            return `${t('morningMeetings.import.row', { defaultValue: 'Row' })} ${parts[1]}: ${translated}`;
          }
          return translated;
        };

        setValidationErrors(
          data?.errors?.map((msg: string, _idx: number) => ({
            row: 0,
            message: translateError(msg),
          })) || [
            { row: 0, message: translateError(data?.errorCode || data?.error || 'PARSE_ERROR') },
          ],
        );
      } else {
        setToast(t('morningMeetings.import.success', { count: data.imported }));
        setShowPreview(false);
        setSelectedFile(null);
        setPreviewRows([]);
        setValidationErrors([]);
        setImportSuccess(true);

        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (e: any) {
      setValidationErrors([{ row: 0, message: String(e?.message || e) }]);
    } finally {
      setImporting(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedFile(null);
    setPreviewRows([]);
    setValidationErrors([]);

    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div>
      <TopBar />
      <div className="app-container p-4 space-y-4">
        <Toast message={toast} onClear={() => setToast(null)} />

        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin?tab=morning')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('ui.back', { defaultValue: 'Back' })}
          </Button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
          <h1 className="text-xl font-semibold">{t('morningMeetings.title')}</h1>
        </div>

        {/* Success Card */}
        {importSuccess && (
          <div className="card-levitate p-6 bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    {t('morningMeetings.import.successTitle', {
                      defaultValue: 'Import Successful!',
                    })}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('morningMeetings.import.successMessage', {
                      defaultValue: 'Your meetings have been imported successfully.',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setImportSuccess(false)}
                  variant="outline"
                  className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950"
                >
                  {t('morningMeetings.import.importMore', { defaultValue: 'Import More' })}
                </Button>
                <Button
                  onClick={() => router.push('/admin?tab=morning')}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  {t('morningMeetings.import.viewSchedule', { defaultValue: 'View Schedule' })} →
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="card-levitate p-6 space-y-4">
          {/* Instructions */}
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-900">
              {t('morningMeetings.import.uploadTitle')}
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>{t('morningMeetings.import.instructions')}</p>
              <ul className="list-disc list-inside mr-4 space-y-1">
                <li>{t('morningMeetings.import.instructionColumns')}</li>
                <li>{t('morningMeetings.import.instructionDateFormat')}</li>
                <li>{t('morningMeetings.import.instructionHebrewDays')}</li>
                <li className="font-medium text-blue-600">
                  {t('morningMeetings.import.instructionCarryForward')}
                </li>
              </ul>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('morningMeetings.import.selectFile')}
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('morningMeetings.import.fileTypes')}
              </p>
              {selectedFile && (
                <p className="text-sm text-gray-700 font-medium">
                  {t('morningMeetings.import.selectedFile')}: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Download Template Link */}
          <div className="text-center">
            <a
              className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              href="/api/templates/morning-meetings.xlsx"
              target="_blank"
              rel="noopener noreferrer"
            >
              📥 {t('morningMeetings.import.downloadExcelTemplate')}
            </a>
          </div>
        </div>

        {/* Preview Dialog */}
        <ImportPreviewDialog
          isOpen={showPreview}
          onClose={handleClosePreview}
          onConfirm={handleImport}
          rows={previewRows}
          errors={validationErrors}
          isLoading={importing}
        />
      </div>
    </div>
  );
}
