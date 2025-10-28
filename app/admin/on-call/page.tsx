'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ImportPreviewDialog, {
  type PreviewRow,
  type ValidationError,
} from '../../../components/admin/on-call/ImportPreviewDialog';
import TopBar from '../../../components/TopBar';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';
import { getCurrentUserWithProfile } from '../../../lib/firebase/auth';

export default function AdminOnCallImportPage() {
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
        if (!profile || profile.status === 'pending') return router.replace('/awaiting-approval');
        if (profile.role !== 'admin') return router.replace('/auth');
      } catch (error) {
        console.error('Failed to check user profile:', error);
        router.replace('/auth');
      }
    })();
  }, [router]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationErrors([]);

    try {
      const buffer = await file.arrayBuffer();

      // Dynamic import - only loads in browser
      const { parseOnCallExcel } = await import('../../../lib/on-call/excel');
      const { rows, errors } = await parseOnCallExcel(buffer);

      const previewData: PreviewRow[] = rows.map((row, idx) => ({
        rowNumber: idx + 3, // +2 for headers, +1 for 1-based
        date: row.date,
        dayOfWeek: row.dayOfWeek,
        shifts: row.shifts,
      }));

      setPreviewRows(previewData);
      setValidationErrors(errors);
      setShowPreview(true);
    } catch (error) {
      console.error('Parse error:', error);
      setToast(t('onCall.import.parseError', { defaultValue: 'Failed to parse Excel file' }));
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const buffer = await selectedFile.arrayBuffer();

      const { fetchWithAuth } = await import('../../../lib/api/client');
      const res = await fetchWithAuth('/api/on-call/import?deferUnknown=true', {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
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
            return `${t('onCall.import.row', { defaultValue: 'Row' })} ${parts[1]}: ${translated}`;
          }
          return translated;
        };

        setValidationErrors(
          data?.errors?.map((msg: string) => ({
            row: 0,
            message: translateError(msg),
          })) || [
            { row: 0, message: translateError(data?.errorCode || data?.error || 'PARSE_ERROR') },
          ],
        );
      } else {
        setToast(
          t('onCall.import.success', {
            count: data.imported,
            defaultValue: `Successfully imported ${data.imported} days with ${data.totalShifts} shifts`,
          }),
        );
        setShowPreview(false);
        setSelectedFile(null);
        setPreviewRows([]);
        setValidationErrors([]);
        setImportSuccess(true);

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

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div>
      <TopBar />
      <div className="app-container p-4 space-y-4">
        <Toast message={toast} onClear={() => setToast(null)} />

        {/* Header with back button and utilities */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin?tab=oncall')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ← {t('ui.back')}
            </Button>
            <h1 className="text-xl font-semibold">
              {t('onCall.import.title', { defaultValue: 'Import On-Call Schedule' })}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/on-call/backfill')}
              title="Open backfill tools"
            >
              Backfill
            </Button>
          </div>
        </div>

        {/* Success card */}
        {importSuccess && (
          <div className="card-levitate p-6 bg-green-50 dark:bg-green-950/30 border-2 border-green-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    {t('onCall.import.successTitle', { defaultValue: 'Import Successful!' })}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('onCall.import.successMessage', {
                      defaultValue: 'On-call schedule imported successfully',
                    })}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/admin?tab=oncall')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t('onCall.import.viewSchedule', { defaultValue: 'View Schedule' })} →
              </Button>
            </div>
          </div>
        )}

        {/* Upload card */}
        <div className="card-levitate p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {t('onCall.import.uploadTitle', { defaultValue: 'Upload Schedule' })}
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                {t('onCall.import.instructions', {
                  defaultValue: 'Upload an Excel file (.xlsx) with the on-call schedule',
                })}
              </p>
              <ul className="list-disc list-inside mr-4 space-y-1">
                <li>
                  {t('onCall.import.instructionFormat', {
                    defaultValue: 'Column B must contain dates',
                  })}
                </li>
                <li>
                  {t('onCall.import.instructionShifts', {
                    defaultValue: 'Columns C-X contain shift assignments',
                  })}
                </li>
                <li>
                  {t('onCall.import.instructionTemplate', {
                    defaultValue: 'Download the template below for the correct format',
                  })}
                </li>
              </ul>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
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
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('onCall.import.selectFile', { defaultValue: 'Select Excel File' })}
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
                {t('onCall.import.fileTypes', { defaultValue: 'Excel files (.xlsx, .xls)' })}
              </p>
              {selectedFile && (
                <p className="text-sm text-gray-700 dark:text-[rgb(var(--fg))] font-medium">
                  {t('onCall.import.selectedFile', { defaultValue: 'Selected' })}:{' '}
                  {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Download Template Link */}
          <div className="text-center">
            <a
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              href="/api/templates/on-call-schedule.xlsx"
              download
            >
              {t('onCall.import.downloadTemplate', { defaultValue: '📥 Download Template' })}
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
