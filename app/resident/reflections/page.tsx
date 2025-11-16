'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import ReflectionCard from '../../../components/reflections/ReflectionCard';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
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

  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.reflections', { defaultValue: 'Reflections' }) as string} />
      <div className="app-container p-4 space-y-3">
        {/* Filters */}
        <Card>
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
            <select
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value)}
              className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              aria-label="Task type filter"
            >
              <option value="">{t('ui.allTaskTypes', { defaultValue: 'All task types' })}</option>
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              aria-label="Sort order"
            >
              <option value="newest">{t('ui.newest', { defaultValue: 'Newest first' })}</option>
              <option value="oldest">{t('ui.oldest', { defaultValue: 'Oldest first' })}</option>
            </select>
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
            <div className="text-sm text-gray-500">
              {filtered.length} {t('ui.results', { defaultValue: 'results' })}
            </div>
          </div>
          {loading ? (
            <div className="text-sm opacity-70">{t('common.loading')}</div>
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
                <div className="text-sm opacity-70 text-center py-8">
                  {t('ui.noResultsFound', { defaultValue: 'No results found' })}
                </div>
              ) : null}
              {!loading && !list?.length ? (
                <div className="text-sm opacity-70 text-center py-8">
                  {t('reflections.noSubmissionsYet')}
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
