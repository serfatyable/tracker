import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import { uploadCurrentExam, deleteCurrentExam } from '@/lib/firebase/exams';
import { haptic } from '@/lib/utils/haptics';
import type { Exam } from '@/types/exam';

interface CurrentExamTabProps {
  exam: Exam;
  isAdmin: boolean;
  userId: string;
}

export default function CurrentExamTab({ exam, isAdmin, userId }: CurrentExamTabProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      haptic('light');
      await uploadCurrentExam(exam.id, file, userId);
      haptic('success');
    } catch (error) {
      console.error('Error uploading exam:', error);
      haptic('error');
      alert(t('exams.admin.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('exams.admin.confirmDeleteCurrent'))) return;

    try {
      setDeleting(true);
      haptic('light');
      await deleteCurrentExam(exam.id, userId);
      haptic('success');
    } catch (error) {
      console.error('Error deleting exam:', error);
      haptic('error');
      alert(t('exams.admin.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!exam.currentExam) return;
    haptic('light');
    window.open(exam.currentExam.fileUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {exam.currentExam ? (
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <DocumentTextIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {exam.currentExam.fileName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('common.uploaded', { defaultValue: 'Uploaded' })}{' '}
                  {exam.currentExam.uploadedAt.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {t('exams.download')}
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {deleting ? (
                    t('exams.admin.deleting')
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
            {t('exams.notUploaded')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('exams.notUploadedDescription')}
          </p>

          {isAdmin && (
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                id="upload-current-exam"
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="upload-current-exam"
                className={`inline-flex items-center gap-2 justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  t('exams.admin.uploading')
                ) : (
                  <>
                    <PlusIcon className="h-5 w-5" />
                    {t('exams.admin.uploadCurrentExam')}
                  </>
                )}
              </label>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
