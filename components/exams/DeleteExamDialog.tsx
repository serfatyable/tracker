import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { deleteExam } from '@/lib/firebase/exams';
import { haptic } from '@/lib/utils/haptics';
import type { Exam } from '@/types/exam';

interface DeleteExamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exams: Exam[];
  userId: string;
}

export default function DeleteExamDialog({
  isOpen,
  onClose,
  onSuccess,
  exams,
  userId,
}: DeleteExamDialogProps) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      haptic('light');

      // Delete all exams in parallel
      await Promise.all(exams.map((exam) => deleteExam(exam.id, userId)));

      haptic('success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting exams:', error);
      haptic('error');
      alert(t('exams.admin.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const isMultiple = exams.length > 1;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {isMultiple
                    ? t('exams.admin.deleteMultipleExams', { count: exams.length })
                    : t('exams.admin.deleteExam')}
                </Dialog.Title>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                {isMultiple
                  ? t('exams.admin.confirmDeleteMultiple', { count: exams.length })
                  : t('exams.admin.confirmDelete')}
              </p>

              {/* Show exam titles */}
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {exams.map((exam) => {
                  const subjectTitles = exam.subjects
                    .map((subject) => subject.titleEn)
                    .join(' + ');
                  return (
                    <div key={exam.id} className="text-sm text-gray-700 py-1">
                      • {subjectTitles}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={deleting}
              >
                {t('exams.admin.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  t('exams.admin.deleting')
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    {isMultiple
                      ? t('exams.admin.deleteMultiple', { count: exams.length })
                      : t('exams.admin.delete')}
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
