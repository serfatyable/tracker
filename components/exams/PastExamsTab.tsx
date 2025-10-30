import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddPastExamDialog from './AddPastExamDialog';

import Card from '@/components/ui/Card';
import { deletePastExam } from '@/lib/firebase/exams';
import { haptic } from '@/lib/utils/haptics';
import type { Exam } from '@/types/exam';

interface PastExamsTabProps {
  exam: Exam;
  isAdmin: boolean;
  userId: string;
}

export default function PastExamsTab({ exam, isAdmin, userId }: PastExamsTabProps) {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (pastExamId: string) => {
    if (!confirm(t('exams.admin.confirmDeleteMaterial'))) return;

    try {
      setDeletingId(pastExamId);
      haptic('light');
      await deletePastExam(exam.id, pastExamId, userId);
      haptic('success');
    } catch (error) {
      console.error('Error deleting past exam:', error);
      haptic('error');
      alert(t('exams.admin.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (url: string) => {
    haptic('light');
    window.open(url, '_blank');
  };

  // Sort past exams by date (most recent first)
  const sortedPastExams = [...exam.pastExams].sort(
    (a, b) => b.examDate.toMillis() - a.examDate.toMillis(),
  );

  if (sortedPastExams.length === 0 && !isAdmin) {
    return (
      <Card className="text-center py-12">
        <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">{t('exams.noPastExams')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              haptic('light');
              setShowAddDialog(true);
            }}
            className="inline-flex items-center gap-2 justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-5 w-5" />
            {t('exams.admin.uploadPastExam')}
          </button>
        </div>
      )}

      {sortedPastExams.length === 0 ? (
        <Card className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-4">{t('exams.noPastExams')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedPastExams.map((pastExam) => (
            <Card key={pastExam.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{pastExam.fileName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {pastExam.examDate.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(pastExam.fileUrl)}
                    className="inline-flex items-center gap-1.5 justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {t('exams.download')}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(pastExam.id)}
                      disabled={deletingId === pastExam.id}
                      className="text-red-600 hover:text-red-700 p-2 disabled:opacity-50"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && showAddDialog && (
        <AddPastExamDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          examId={exam.id}
          userId={userId}
        />
      )}
    </div>
  );
}
