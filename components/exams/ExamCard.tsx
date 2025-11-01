import { CalendarIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteExamDialog from '@/components/exams/DeleteExamDialog';
import Card from '@/components/ui/Card';
import { getLocalized } from '@/lib/i18n/getLocalized';
import { haptic } from '@/lib/utils/haptics';
import type { Exam } from '@/types/exam';

interface ExamCardProps {
  exam: Exam;
  isAdmin: boolean;
  userId?: string;
  onDelete?: () => void;
}

export default function ExamCard({ exam, isAdmin, userId, onDelete }: ExamCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const examDate = exam.examDate.toDate();
  const now = new Date();
  const daysUntil = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getDateLabel = () => {
    if (daysUntil === 0) return t('exams.today');
    if (daysUntil === 1) return t('exams.tomorrow');
    if (daysUntil > 0) return t('exams.daysUntil', { count: daysUntil });
    return t('exams.daysAgo', { count: Math.abs(daysUntil) });
  };

  const getDateColor = () => {
    if (daysUntil < 0) return 'text-gray-500 dark:text-gray-400';
    if (daysUntil <= 7) return 'text-orange-600 dark:text-orange-500 font-semibold';
    return 'text-blue-600 dark:text-blue-400';
  };

  const handleClick = () => {
    haptic('light');
    router.push(`/exams/${exam.id}`);
  };

  const handleTitleClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation(); // Prevent card click
    haptic('light');
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    haptic('light');
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    if (onDelete) {
      onDelete();
    }
  };

  // Aggregate all topics and chapters from all subjects
  const allTopics = Array.from(new Set(exam.subjects.flatMap((subject) => subject.topics)));
  const allChapters = Array.from(new Set(exam.subjects.flatMap((subject) => subject.bookChapters)));

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200 hover:border-blue-400"
      onClick={handleClick}
    >
      <div className="space-y-3">
        {/* Header - Subjects */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            {exam.subjects.map((subject, idx) => {
              const title = getLocalized({
                en: subject.titleEn,
                he: subject.titleHe,
                lang: i18n.language as 'en' | 'he',
              });
              const link = subject.examLink || exam.examLink;

              return (
                <div key={subject.id} className="flex items-start gap-2">
                  {exam.subjects.length > 1 && (
                    <span className="text-sm text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">
                      {idx + 1}.
                    </span>
                  )}
                  {link ? (
                    <h3
                      onClick={(e) => handleTitleClick(e, link)}
                      className="font-semibold text-base line-clamp-2 text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {title}
                    </h3>
                  ) : (
                    <h3 className="font-semibold text-base line-clamp-2">{title}</h3>
                  )}
                </div>
              );
            })}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <PencilIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              {userId && (
                <button
                  onClick={handleDeleteClick}
                  className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  title={t('exams.admin.delete')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Exam Date */}
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <div>
            <div className="text-gray-700 dark:text-gray-300">
              {examDate.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className={`text-xs ${getDateColor()}`}>{getDateLabel()}</div>
          </div>
        </div>

        {/* Topics */}
        {allTopics.length > 0 && (
          <div className="text-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('exams.topics')}:</div>
            <div className="flex flex-wrap gap-1">
              {allTopics.slice(0, 3).map((topic, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs"
                >
                  {topic}
                </span>
              ))}
              {allTopics.length > 3 && (
                <span className="inline-block text-gray-500 dark:text-gray-400 px-2 py-0.5 text-xs">
                  +{allTopics.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Book Chapters */}
        {allChapters.length > 0 && (
          <div className="text-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('exams.bookChapters')}:</div>
            <div className="flex items-center gap-1">
              <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-700 dark:text-gray-300">{allChapters.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Materials indicator */}
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
          {exam.currentExam && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{t('exams.currentExam')}</span>
            </div>
          )}
          {exam.studyMaterials.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>
                {exam.studyMaterials.length} {t('exams.materials')}
              </span>
            </div>
          )}
          {exam.pastExams.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span>
                {exam.pastExams.length} {t('exams.past')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      {userId && (
        <DeleteExamDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onSuccess={handleDeleteSuccess}
          exams={[exam]}
          userId={userId}
        />
      )}
    </Card>
  );
}
