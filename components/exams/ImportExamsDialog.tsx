import { Dialog } from '@headlessui/react';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { haptic } from '@/lib/utils/haptics';
// import type { ExamExcelRow } from '@/lib/exams/excel';

interface ImportExamsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'success';

interface ParseResult {
  exams: Array<{
    examDate: string;
    examLink?: string;
    subjects: Array<{
      titleEn: string;
      titleHe: string;
      topics: string;
      bookChapters: string;
      descriptionEn?: string;
      descriptionHe?: string;
      examLink?: string;
    }>;
  }>;
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ examDate: string; subjectCount: number; message: string }>;
  duplicates: Array<{ examDate: string }>;
}

export default function ImportExamsDialog({ isOpen, onClose, onSuccess }: ImportExamsDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    haptic('light');

    // Parse file immediately
    try {
      // const arrayBuffer = await selectedFile.arrayBuffer();
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Get auth token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();

      // Call API to parse
      const response = await fetch('/api/exams/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setParseResult({
          exams: [],
          errors: data.errors || [{ row: 0, message: data.error || 'Parse failed' }],
          warnings: data.warnings || [],
          duplicates: data.duplicates || [],
        });
        setStep('preview');
      } else {
        // Always show preview (duplicates are auto-accepted)
        setParseResult(data);
        setStep('preview');
      }
    } catch (error) {
      console.error('Parse error:', error);
      setParseResult({
        exams: [],
        errors: [{ row: 0, message: 'Failed to parse file' }],
        warnings: [],
        duplicates: [],
      });
      setStep('preview');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setImporting(true);
      setStep('importing');
      haptic('light');

      const formData = new FormData();
      formData.append('file', file);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      const response = await fetch('/api/exams/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);
      setStep('success');
      haptic('success');
      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      haptic('error');
      alert(t('exams.import.error'));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setImportResult(null);
    onClose();
  };

  const handleDownloadTemplate = () => {
    haptic('light');
    window.open('/api/templates/exams.xlsx', '_blank');
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{t('exams.import.title')}</Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              disabled={importing}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Upload Step */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 space-y-2">
                  <p>{t('exams.import.instructions')}</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>{t('exams.import.requiredColumns')}</li>
                    <li>{t('exams.import.optionalColumns')}</li>
                    <li>{t('exams.import.dateFormat')}</li>
                  </ul>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {t('exams.import.downloadTemplate')}
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    id="exam-file-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="exam-file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {t('exams.import.selectFile')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('exams.import.fileTypes')}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && parseResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('exams.import.totalExams')}</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {parseResult.exams?.length || 0}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('exams.import.totalSubjects')}</div>
                    <div className="text-2xl font-bold text-green-600">
                      {parseResult.exams?.reduce((sum, exam) => sum + exam.subjects.length, 0) || 0}
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('exams.import.errors')}</div>
                    <div className="text-2xl font-bold text-red-600">
                      {parseResult.errors?.length || 0}
                    </div>
                  </div>
                </div>

                {(parseResult.warnings?.length || 0) > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">
                      {t('exams.import.warnings')}
                    </h3>
                    <div className="space-y-1 text-sm text-yellow-700 max-h-32 overflow-y-auto">
                      {(parseResult.warnings || []).map((warn, idx) => (
                        <div key={idx}>{warn.message}</div>
                      ))}
                    </div>
                  </div>
                )}

                {parseResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">
                      {t('exams.import.validationErrors')}
                    </h3>
                    <div className="space-y-1 text-sm text-red-700 max-h-40 overflow-y-auto">
                      {parseResult.errors.map((err, idx) => (
                        <div key={idx}>
                          {t('exams.import.row')} {err.row}: {err.message}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-red-600">
                      {t('exams.import.cannotImport')}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {t('ui.cancel')}
                  </button>
                  {parseResult.errors.length === 0 && (
                    <button
                      onClick={handleImport}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      {t('exams.import.confirmImport')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Importing Step */}
            {step === 'importing' && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('exams.import.importingExams', { count: parseResult?.exams.length || 0 })}
                </p>
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && importResult && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('exams.import.successTitle')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('exams.import.successMessage', { count: importResult.totalExams })}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('exams.import.created')}</div>
                    <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('exams.import.updated')}</div>
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('exams.import.skipped')}</div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{importResult.skipped}</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {t('exams.import.viewExams')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
