'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import ReflectionCard from '../../../components/reflections/ReflectionCard';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useCurrentUserProfile } from '../../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForResident } from '../../../lib/hooks/useReflections';

export default function ResidentReflectionsIndexPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: me } = useCurrentUserProfile();
  const { list, loading } = useReflectionsForResident(me?.uid || null);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Get unique task types for filter dropdown
  const taskTypes = useMemo(() => {
    const types = new Set<string>();
    (list || []).forEach((r: any) => {
      if (r.taskType) types.add(r.taskType);
    });
    return Array.from(types).sort();
  }, [list]);

  // Filter and sort reflections
  const filtered = useMemo(() => {
    let result = [...(list || [])];

    // Date range filter
    result = result.filter((r: any) => {
      const submitted = r.submittedAt?.toDate?.() as Date | undefined;
      if (from && submitted && submitted < new Date(from)) return false;
      if (to && submitted && submitted > new Date(to)) return false;
      return true;
    });

    // Task type filter
    if (taskTypeFilter) {
      result = result.filter((r: any) => r.taskType === taskTypeFilter);
    }

    // Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r: any) =>
          r.taskType?.toLowerCase().includes(term) ||
          r.taskOccurrenceId?.toLowerCase().includes(term),
      );
    }

    // Sort
    result.sort((a: any, b: any) => {
      const dateA = a.submittedAt?.toDate?.()?.getTime() || 0;
      const dateB = b.submittedAt?.toDate?.()?.getTime() || 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [list, from, to, taskTypeFilter, searchTerm, sortOrder]);

  const handleReflectionClick = (reflection: any) => {
    router.push(`/resident/reflections/${reflection.taskOccurrenceId}`);
  };

  const hasActiveFilters = from || to || taskTypeFilter || searchTerm;

  const handleClearFilters = () => {
    setFrom('');
    setTo('');
    setTaskTypeFilter('');
    setSearchTerm('');
  };

  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.reflections', { defaultValue: 'Reflections' }) as string} />
      <div className="app-container p-4 space-y-3">
        {/* Filters */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{t('ui.filters', { defaultValue: 'Filters' })}</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={t('ui.from', { defaultValue: 'From' }) as string}
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={t('ui.to', { defaultValue: 'To' }) as string}
              aria-label="To date"
            />
            <Select
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value)}
              aria-label="Task type filter"
            >
              <option value="">{t('ui.allTaskTypes', { defaultValue: 'All task types' })}</option>
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              aria-label="Sort order"
            >
              <option value="newest">{t('ui.newest', { defaultValue: 'Newest first' })}</option>
              <option value="oldest">{t('ui.oldest', { defaultValue: 'Oldest first' })}</option>
            </Select>
          </div>
          <div className="mt-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                t('ui.searchReflections', { defaultValue: 'Search reflections...' }) as string
              }
              aria-label="Search reflections"
            />
          </div>
        </Card>

        {/* Results */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">{t('resident.myReflections')}</div>
            {!loading && (
              <div className="text-sm text-gray-500">
                {filtered.length} {t('ui.results', { defaultValue: 'results' })}
              </div>
            )}
          </div>
          {loading ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="sr-only">{t('common.loading')}</p>
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <ReflectionCard
                  key={r.id}
                  reflection={r}
                  onClick={() => handleReflectionClick(r)}
                />
              ))}
              {!loading && filtered.length === 0 && list && list.length > 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {t('ui.noResultsFound', { defaultValue: 'No results found' })}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('ui.tryAdjustingFilters', { defaultValue: 'Try adjusting your filters' })}
                  </p>
                </div>
              ) : null}
              {!loading && !list?.length ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {t('reflections.noSubmissionsYet', { defaultValue: 'No reflections yet' })}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('reflections.noSubmissionsMessage', {
                      defaultValue: 'Your reflections will appear here once submitted',
                    })}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
