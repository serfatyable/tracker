'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { importRotationFromCsv } from '../../../lib/firebase/admin';
import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import Toast from '../../ui/Toast';

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (rotationId: string) => void;
  rotationId?: string; // If provided, auto-merge into this rotation
};

export default function TemplateImportDialog({ open, onClose, onImported, rotationId }: Props) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  // Auto-determine mode based on whether rotationId is provided
  const mode: 'create' | 'merge' = rotationId ? 'merge' : 'create';
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function doImport() {
    // Validate: file must be selected
    if (!file) {
      setErrors([t('import.selectFile') || 'Please select a file to import']);
      return;
    }
    setErrors([]);
    setImporting(true);

    try {
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrors(['Unsupported file format. Please use Excel (.xlsx or .xls)']);
        setImporting(false);
        return;
      }

      // Parse Excel file directly
      const buffer = await file.arrayBuffer();
      const res = await importRotationFromCsv({
        mode,
        rotationId: mode === 'merge' ? rotationId : undefined,
        excelBuffer: buffer,
        rotationMeta:
          mode === 'create'
            ? {
                name: `Imported ${new Date().toISOString().slice(0, 10)}`,
                startDate: (await import('firebase/firestore')).Timestamp.fromDate(new Date()),
                endDate: (await import('firebase/firestore')).Timestamp.fromDate(new Date()),
                status: 'active',
              }
            : undefined,
      });
      if (res.errors.length) {
        setErrors(res.errors);
        return;
      }

      // Show success message
      setSuccessMessage(
        mode === 'create'
          ? t('import.successfullyCreated') || 'Rotation created successfully!'
          : t('import.successfullyMerged') || 'Items merged successfully!',
      );

      // Wait a bit to show success message before closing
      setTimeout(() => {
        onImported(res.rotationId);
        onClose();
        setSuccessMessage(null);
        // Reset state
        setFile(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to import rotation:', error);
      setErrors([
        t('import.importFailed') + ': ' + (error instanceof Error ? error.message : String(error)),
      ]);
    } finally {
      setImporting(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrors([]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrors([]);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-teal-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span>{t('import.importRotationData')}</span>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-6">
        {/* Download Templates Section */}
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('import.downloadTemplateFirst')}
              </h3>
              <p className="text-xs text-gray-700 dark:text-[rgb(var(--fg))] mb-3">
                {t('import.templateInstructions')}
              </p>
              <div className="flex gap-2">
                <a
                  href="/api/templates/rotation.xlsx"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-[rgb(var(--surface))] border border-gray-300 dark:border-[rgb(var(--border))] hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] transition-colors"
                  download
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Excel Template
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))] mb-2">
            {t('import.uploadFile')}
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                : file
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-12 h-12 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                >
                  {t('ui.remove')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('import.dragDropFile')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('import.orClickToSelect')}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">XLSX or XLS</p>
              </div>
            )}
          </div>
        </div>

        {/* Import Mode - only show if no rotation specified */}
        {!rotationId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t('import.creatingNewRotation')}
                </h4>
                <p className="text-xs text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('import.newRotationWillBeCreated')}
                </p>
              </div>
            </div>
          </div>
        )}

        {rotationId && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t('import.mergingIntoRotation')}
                </h4>
                <p className="text-xs text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('import.itemsWillBeAddedToRotation')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  {t('import.errorsFound')}
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="list-disc list-inside">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={importing}>
          {t('ui.cancel')}
        </Button>
        <Button
          onClick={doImport}
          disabled={!file || importing}
          className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-600 dark:hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
        >
          {importing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('import.importing')}
            </>
          ) : (
            t('ui.import')
          )}
        </Button>
      </DialogFooter>

      <Toast message={successMessage} onClear={() => setSuccessMessage(null)} />
    </Dialog>
  );
}
