import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { addPastExam } from '@/lib/firebase/exams';
import { haptic } from '@/lib/utils/haptics';

interface AddPastExamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  userId: string;
}

export default function AddPastExamDialog({
  isOpen,
  onClose,
  examId,
  userId,
}: AddPastExamDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [examDate, setExamDate] = useState<Date>(new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError(t('exams.admin.selectFile'));
      return;
    }

    try {
      setLoading(true);
      haptic('light');
      await addPastExam(examId, file, examDate, userId);
      haptic('success');
      onClose();
      // Reset form
      setFile(null);
      setExamDate(new Date());
    } catch (err) {
      console.error('Error adding past exam:', err);
      setError(t('exams.admin.uploadError'));
      haptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {t('exams.admin.uploadPastExam')}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              disabled={loading}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Exam Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('exams.admin.pastExamDate')} *
              </label>
              <input
                type="date"
                value={examDate.toISOString().split('T')[0]}
                onChange={(e) => setExamDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('exams.admin.pastExamDate')}
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('exams.admin.selectFile')} *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              />
              {file && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {t('common.selectedFile', { defaultValue: 'Selected' })}: {file.name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {t('exams.admin.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? t('exams.admin.uploading') : t('exams.admin.upload')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
