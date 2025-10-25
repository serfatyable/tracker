'use client';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import CreateExamDialog from '@/components/exams/CreateExamDialog';
import ExamCard from '@/components/exams/ExamCard';
import ExportCalendarDialog from '@/components/exams/ExportCalendarDialog';
import ImportExamsDialog from '@/components/exams/ImportExamsDialog';
import AppShell from '@/components/layout/AppShell';
import LargeTitleHeader from '@/components/layout/LargeTitleHeader';
import Card from '@/components/ui/Card';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { useCategorizedExams } from '@/lib/hooks/useExams';
import { haptic } from '@/lib/utils/haptics';
import type { Exam } from '@/types/exam';

type FilterType = 'all' | 'upcoming' | 'current' | 'past';

export default function ExamsPage() {
  const { t, i18n } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { upcoming, current, past, loading, error } = useCategorizedExams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const isAdmin = me?.role === 'admin' || me?.role === 'tutor';

  // Combine all exams for filtering
  const allExams = useMemo(() => {
    return [...upcoming, ...current, ...past];
  }, [upcoming, current, past]);

  // Filter and search exams
  const filteredExams = useMemo(() => {
    let exams: Exam[] = [];

    // Apply category filter
    switch (activeFilter) {
      case 'upcoming':
        exams = upcoming;
        break;
      case 'current':
        exams = current;
        break;
      case 'past':
        exams = past;
        break;
      default:
        exams = allExams;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      exams = exams.filter((exam) => {
        // Search in subject titles and descriptions
        const subjectMatches = exam.subjects.some((subject) => {
          const title = i18n.language === 'he' ? subject.titleHe : subject.titleEn;
          const description =
            i18n.language === 'he' ? subject.descriptionHe : subject.descriptionEn;

          return (
            title.toLowerCase().includes(query) ||
            description?.toLowerCase().includes(query) ||
            subject.topics.some((topic) => topic.toLowerCase().includes(query)) ||
            subject.bookChapters.some((chapter) => chapter.toLowerCase().includes(query))
          );
        });

        return subjectMatches;
      });
    }

    return exams;
  }, [allExams, upcoming, current, past, activeFilter, searchQuery, i18n.language]);

  const handleCreateClick = () => {
    haptic('light');
    setShowCreateDialog(true);
  };

  const handleExportClick = () => {
    haptic('light');
    setShowExportDialog(true);
  };

  const handleImportClick = () => {
    haptic('light');
    setShowImportDialog(true);
  };

  const handleFilterChange = (filter: FilterType) => {
    haptic('light');
    setActiveFilter(filter);
  };

  const handleClearSearch = () => {
    haptic('light');
    setSearchQuery('');
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

  if (error) {
    return (
      <AppShell>
        <LargeTitleHeader title={t('exams.title')} />
        <div className="app-container p-3 sm:p-4">
          <div className="text-red-500">{t('errors.unexpectedError')}</div>
        </div>
      </AppShell>
    );
  }

  const hasExams = allExams.length > 0;

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('exams.title')}
        subtitle={t('exams.subtitle')}
        rightSlot={
          <div className="flex items-center gap-2">
            {hasExams && (
              <button
                onClick={handleExportClick}
                className="inline-flex items-center gap-1.5 justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
              >
                <CalendarIcon className="h-4 w-4" />
                {t('exams.export.exportButton')}
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={handleImportClick}
                  className="inline-flex items-center gap-1.5 justify-center rounded-md border border-green-500 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 min-h-[32px]"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {t('exams.import.uploadButton')}
                </button>
                <button
                  onClick={handleCreateClick}
                  className="inline-flex items-center gap-1.5 justify-center rounded-md border border-blue-500 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t('exams.admin.addExam')}
                </button>
              </>
            )}
          </div>
        }
      />
      <div className="app-container p-3 sm:p-4 space-y-4">
        {hasExams && (
          <>
            {/* Search and Filter Bar */}
            <Card className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('exams.search.placeholder')}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('exams.filters.all')} ({allExams.length})
                </button>
                <button
                  onClick={() => handleFilterChange('upcoming')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeFilter === 'upcoming'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('exams.filters.upcoming')} ({upcoming.length})
                </button>
                <button
                  onClick={() => handleFilterChange('current')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeFilter === 'current'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('exams.filters.current')} ({current.length})
                </button>
                <button
                  onClick={() => handleFilterChange('past')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeFilter === 'past'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('exams.filters.past')} ({past.length})
                </button>
              </div>
            </Card>

            {/* Filtered Results */}
            {filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} isAdmin={isAdmin} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">{t('exams.search.noResults')}</p>
                <p className="text-sm text-gray-500 mb-4">
                  {t('exams.search.noResultsDescription')}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    haptic('light');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                  {t('exams.search.clearSearch')}
                </button>
              </Card>
            )}
          </>
        )}

        {/* Empty state - no exams at all */}
        {!hasExams && (
          <Card className="text-center py-12">
            <p className="text-muted text-lg mb-2">{t('exams.noExams')}</p>
            <p className="text-sm text-gray-500">
              {isAdmin &&
                t('exams.admin.useAddButton', {
                  defaultValue: 'Use the "Add Exam" button above to create your first exam',
                })}
            </p>
          </Card>
        )}
      </div>

      {/* Create Exam Dialog (Admin only) */}
      {isAdmin && showCreateDialog && (
        <CreateExamDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          userId={me?.uid || ''}
        />
      )}

      {/* Export Calendar Dialog */}
      {showExportDialog && (
        <ExportCalendarDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* Import Exams Dialog (Admin only) */}
      {isAdmin && showImportDialog && (
        <ImportExamsDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onSuccess={() => {
            // Exams will refresh automatically via real-time hooks
          }}
        />
      )}
    </AppShell>
  );
}
