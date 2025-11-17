'use client';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import CreateExamDialog from '@/components/exams/CreateExamDialog';
import DeleteExamDialog from '@/components/exams/DeleteExamDialog';
import ExamCard from '@/components/exams/ExamCard';
import ExportCalendarDialog from '@/components/exams/ExportCalendarDialog';
import ImportExamsDialog from '@/components/exams/ImportExamsDialog';
import AppShell from '@/components/layout/AppShell';
import LargeTitleHeader from '@/components/layout/LargeTitleHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { useCategorizedExams } from '@/lib/hooks/useExams';
import { createSynonymMatcher } from '@/lib/search/synonyms';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());

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
      const matcher = createSynonymMatcher(searchQuery);
      exams = exams.filter((exam) => {
        // Search in subject titles and descriptions
        const subjectMatches = exam.subjects.some((subject) => {
          const title = i18n.language === 'he' ? subject.titleHe : subject.titleEn;
          const description =
            i18n.language === 'he' ? subject.descriptionHe : subject.descriptionEn;

          return (
            matcher(title) ||
            matcher(description) ||
            subject.topics.some((topic) => matcher(topic)) ||
            subject.bookChapters.some((chapter) => matcher(chapter))
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

  const translate = useCallback(
    (key: string, defaultValue: string) => {
      const value = t(key, { defaultValue });
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      return defaultValue;
    },
    [t],
  );

  const downloadLabel = translate('exams.export.downloadICS', 'Download ICS File');
  const optionLabel = translate('exams.export.gradientOptionLabel', 'Option A');
  const optionDescription = translate(
    'exams.export.gradientOptionDescription',
    'Vibrant gradient spotlight with a subtle glow.',
  );

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

  const _handleSelectExam = (examId: string, selected: boolean) => {
    haptic('light');
    setSelectedExams((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(examId);
      } else {
        newSet.delete(examId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    haptic('light');
    if (selectedExams.size === filteredExams.length) {
      setSelectedExams(new Set());
    } else {
      setSelectedExams(new Set(filteredExams.map((exam) => exam.id)));
    }
  };

  const handleBulkDelete = () => {
    haptic('light');
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    setSelectedExams(new Set());
  };

  const selectedExamsList = filteredExams.filter((exam) => selectedExams.has(exam.id));

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

  const headerActions = ({ compact }: { compact: boolean }) => {
    if (compact) {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2 text-right">
          {hasExams ? (
            <Button
              size="sm"
              variant="ghost"
              className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-offset-0 focus-visible:ring-white/70 dark:focus-visible:ring-white/40"
              leftIcon={<SparklesIcon className="h-4 w-4" />}
              onClick={handleExportClick}
              aria-label={`${optionLabel} – ${downloadLabel}`}
            >
              {downloadLabel}
            </Button>
          ) : null}
          {isAdmin ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-green-500/80 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-400/10"
                leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                onClick={handleImportClick}
              >
                Import
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={handleCreateClick}
              >
                Add New
              </Button>
            </>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 text-left lg:flex-row lg:items-start lg:justify-end lg:gap-6 lg:text-right">
        {hasExams ? (
          <>
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="md"
                className="w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-offset-0 focus-visible:ring-white/60 active:translate-y-0 dark:focus-visible:ring-white/40"
                leftIcon={<SparklesIcon className="h-5 w-5" />}
                onClick={handleExportClick}
                aria-label={`${optionLabel} – ${downloadLabel}`}
              >
                {downloadLabel}
              </Button>
            </div>
            <div className="hidden w-full flex-col gap-3 rounded-2xl border border-gray-200/70 bg-white/85 p-5 text-left shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 lg:flex lg:max-w-sm">
              <div className="space-y-1 text-gray-600 dark:text-gray-300">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {optionLabel}
                </div>
                <p className="text-sm leading-relaxed">{optionDescription}</p>
              </div>
              <Button
                variant="ghost"
                size="lg"
                className="w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-offset-0 focus-visible:ring-white/60 active:translate-y-0 dark:focus-visible:ring-white/40"
                leftIcon={<SparklesIcon className="h-5 w-5" />}
                onClick={handleExportClick}
                aria-label={`${optionLabel} – ${downloadLabel}`}
              >
                {downloadLabel}
              </Button>
            </div>
          </>
        ) : null}
        {isAdmin ? (
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                className="border-green-500/80 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-400/10"
                leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                onClick={handleImportClick}
              >
                Import Exams
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={handleCreateClick}
              >
                Add New Exam
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('exams.title')}
        subtitle={t('exams.subtitle')}
        rightSlot={headerActions}
      />
      <div className="app-container p-3 sm:p-4 space-y-4">
        {hasExams && (
          <>
            {/* Search and Filter Bar */}
            <Card className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
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

            {/* Bulk Actions Bar */}
            {isAdmin && filteredExams.length > 0 && (
              <Card className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        selectedExams.size === filteredExams.length && filteredExams.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedExams.size === filteredExams.length
                        ? t('exams.admin.deselectAll')
                        : t('exams.admin.selectAll')}
                    </span>
                  </label>
                  {selectedExams.size > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedExams.size} {t('exams.admin.selected')}
                    </span>
                  )}
                </div>
                {selectedExams.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t('exams.admin.deleteSelected', { count: selectedExams.size })}
                  </button>
                )}
              </Card>
            )}

            {/* Filtered Results */}
            {filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    isAdmin={isAdmin}
                    userId={me?.uid}
                    onDelete={() => {
                      // Refresh the list after individual delete
                      setSelectedExams((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(exam.id);
                        return newSet;
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                  {t('exams.search.noResults')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
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

      {/* Bulk Delete Dialog (Admin only) */}
      {isAdmin && showDeleteDialog && selectedExamsList.length > 0 && (
        <DeleteExamDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onSuccess={handleDeleteSuccess}
          exams={selectedExamsList}
          userId={me?.uid || ''}
        />
      )}
    </AppShell>
  );
}
