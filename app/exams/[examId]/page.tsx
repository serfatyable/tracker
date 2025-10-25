'use client';
import { ArrowLeftIcon, CalendarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CurrentExamTab from '@/components/exams/CurrentExamTab';
import EditExamDialog from '@/components/exams/EditExamDialog';
import PastExamsTab from '@/components/exams/PastExamsTab';
import StudyMaterialsTab from '@/components/exams/StudyMaterialsTab';
import AppShell from '@/components/layout/AppShell';
import LargeTitleHeader from '@/components/layout/LargeTitleHeader';
import Card from '@/components/ui/Card';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { useExam } from '@/lib/hooks/useExams';
import { getLocalized } from '@/lib/i18n/getLocalized';
import { haptic } from '@/lib/utils/haptics';

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const examId = params.examId as string;
  const { exam, loading, error } = useExam(examId);
  const [activeTab, setActiveTab] = useState<'current' | 'study' | 'archive'>('current');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isAdmin = me?.role === 'admin' || me?.role === 'tutor';

  const handleBack = () => {
    haptic('light');
    router.back();
  };

  const handleEdit = () => {
    haptic('light');
    setShowEditDialog(true);
  };

  const handleTabChange = (tab: 'current' | 'study' | 'archive') => {
    haptic('light');
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <AppShell>
        <LargeTitleHeader title={t('exams.title')} />
        <div className="app-container p-3 sm:p-4">
          <div className="text-muted">{t('common.loading')}</div>
        </div>
      </AppShell>
    );
  }

  if (error || !exam) {
    return (
      <AppShell>
        <LargeTitleHeader title={t('exams.title')} />
        <div className="app-container p-3 sm:p-4">
          <div className="text-red-500">{t('errors.unexpectedError')}</div>
        </div>
      </AppShell>
    );
  }

  const examDate = exam.examDate.toDate();

  // Create a combined title from all subjects
  const subjectTitles = exam.subjects.map((subject) =>
    getLocalized({
      en: subject.titleEn,
      he: subject.titleHe,
      lang: i18n.language as 'en' | 'he',
    }),
  );
  const combinedTitle = subjectTitles.join(' + ');

  // Aggregate all topics and chapters (commented out for future use)
  // const allTopics = Array.from(
  //   new Set(exam.subjects.flatMap((subject) => subject.topics))
  // );
  // const allChapters = Array.from(
  //   new Set(exam.subjects.flatMap((subject) => subject.bookChapters))
  // );

  return (
    <AppShell>
      <LargeTitleHeader
        title={combinedTitle}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t('exams.backToList')}
            </button>
            {isAdmin && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 justify-center rounded-md border border-blue-500 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
              >
                <PencilIcon className="h-4 w-4" />
                {t('exams.admin.editExam')}
              </button>
            )}
          </div>
        }
      />

      <div className="app-container p-3 sm:p-4 space-y-4">
        {/* Exam Info Card */}
        <Card className="space-y-4">
          {/* Exam Date */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700 font-medium">
              {examDate.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Exam Link */}
          {exam.examLink && (
            <div>
              <a
                href={exam.examLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                onClick={() => haptic('light')}
              >
                {t('exams.admin.examLink')}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}

          {/* Subjects */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {exam.subjects.map((subject, idx) => {
              const subjectTitle = getLocalized({
                en: subject.titleEn,
                he: subject.titleHe,
                lang: i18n.language as 'en' | 'he',
              });
              const subjectDescription = getLocalized({
                en: subject.descriptionEn || '',
                he: subject.descriptionHe || '',
                lang: i18n.language as 'en' | 'he',
              });
              const subjectLink = subject.examLink || exam.examLink;

              return (
                <div key={subject.id} className="space-y-2">
                  {/* Subject Title */}
                  <div className="flex items-start gap-2">
                    {exam.subjects.length > 1 && (
                      <span className="text-sm text-gray-400 font-medium flex-shrink-0 mt-0.5">
                        {idx + 1}.
                      </span>
                    )}
                    <div className="flex-1">
                      {subjectLink ? (
                        <a
                          href={subjectLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-base text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1.5"
                          onClick={() => haptic('light')}
                        >
                          {subjectTitle}
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <h3 className="font-semibold text-base">{subjectTitle}</h3>
                      )}
                      {subjectDescription && (
                        <p className="text-sm text-gray-600 mt-1">{subjectDescription}</p>
                      )}
                    </div>
                  </div>

                  {/* Subject Topics */}
                  {subject.topics.length > 0 && (
                    <div className="ml-6">
                      <div className="text-xs text-gray-500 mb-1.5">{t('exams.topics')}:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {subject.topics.map((topic, topicIdx) => (
                          <span
                            key={topicIdx}
                            className="inline-block bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-sm"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject Chapters */}
                  {subject.bookChapters.length > 0 && (
                    <div className="ml-6">
                      <div className="text-xs text-gray-500 mb-1.5">{t('exams.bookChapters')}:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {subject.bookChapters.map((chapter, chapterIdx) => (
                          <span
                            key={chapterIdx}
                            className="inline-block bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-sm"
                          >
                            {chapter}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tabs */}
        <div className="sticky top-[52px] z-20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70 py-2 border-b border-muted/20">
          <div className="flex gap-2 overflow-x-auto">
            <button
              className={`tab-levitate whitespace-nowrap ${
                activeTab === 'current' ? 'ring-1 ring-primary' : ''
              }`}
              onClick={() => handleTabChange('current')}
              aria-pressed={activeTab === 'current'}
            >
              {t('exams.tabs.current')}
            </button>
            <button
              className={`tab-levitate whitespace-nowrap ${
                activeTab === 'study' ? 'ring-1 ring-primary' : ''
              }`}
              onClick={() => handleTabChange('study')}
              aria-pressed={activeTab === 'study'}
            >
              {t('exams.tabs.study')}
            </button>
            <button
              className={`tab-levitate whitespace-nowrap ${
                activeTab === 'archive' ? 'ring-1 ring-primary' : ''
              }`}
              onClick={() => handleTabChange('archive')}
              aria-pressed={activeTab === 'archive'}
            >
              {t('exams.tabs.archive')}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'current' && (
          <CurrentExamTab exam={exam} isAdmin={isAdmin} userId={me?.uid || ''} />
        )}
        {activeTab === 'study' && (
          <StudyMaterialsTab exam={exam} isAdmin={isAdmin} userId={me?.uid || ''} />
        )}
        {activeTab === 'archive' && (
          <PastExamsTab exam={exam} isAdmin={isAdmin} userId={me?.uid || ''} />
        )}
      </div>

      {/* Edit Dialog */}
      {isAdmin && showEditDialog && (
        <EditExamDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          exam={exam}
          userId={me?.uid || ''}
        />
      )}
    </AppShell>
  );
}
