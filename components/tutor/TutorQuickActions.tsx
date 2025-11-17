'use client';

import {
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentChartBarIcon,
  CalendarIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color: string;
  bgColor: string;
};

type Props = {
  pendingCount: number;
};

export default function TutorQuickActions({ pendingCount }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: 'review',
      label: t('tutor.quickActions.reviewPending'),
      icon: CheckCircleIcon,
      onClick: () => router.push('/tutor/tasks'),
      color: 'text-teal-700 dark:text-teal-300',
      bgColor:
        'bg-gradient-to-br from-teal-500/10 to-cyan-500/10 hover:from-teal-500/20 hover:to-cyan-500/20',
    },
    {
      id: 'message',
      label: t('tutor.quickActions.messageResidents'),
      icon: ChatBubbleLeftRightIcon,
      onClick: () => {
        // Message functionality - placeholder
        alert(t('tutor.quickActions.comingSoon'));
      },
      color: 'text-sky-700 dark:text-sky-300',
      bgColor:
        'bg-gradient-to-br from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20',
    },
    {
      id: 'reports',
      label: t('tutor.quickActions.exportReports'),
      icon: DocumentChartBarIcon,
      onClick: () => {
        // Export functionality - placeholder
        alert(t('tutor.quickActions.comingSoon'));
      },
      color: 'text-violet-700 dark:text-violet-300',
      bgColor:
        'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20',
    },
    {
      id: 'schedule',
      label: t('tutor.quickActions.scheduleOfficeHours'),
      icon: CalendarIcon,
      onClick: () => {
        // Schedule functionality - placeholder
        alert(t('tutor.quickActions.comingSoon'));
      },
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor:
        'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20',
    },
    {
      id: 'resources',
      label: t('tutor.quickActions.teachingResources'),
      icon: BookOpenIcon,
      onClick: () => {
        // Resources functionality - placeholder
        alert(t('tutor.quickActions.comingSoon'));
      },
      color: 'text-amber-700 dark:text-amber-300',
      bgColor:
        'bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20',
    },
  ];

  return (
    <div className="sticky top-20 z-10">
      <div className="rounded-2xl bg-white/80 p-4 shadow-lg ring-1 ring-gray-200/60 backdrop-blur-md dark:bg-slate-900/80 dark:ring-gray-700/60">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
            {t('tutor.quickActions.title')}
          </h3>
          {pendingCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-xs font-bold text-white shadow-lg">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`group relative overflow-hidden rounded-xl ${action.bgColor} p-4 text-left shadow-sm ring-1 ring-gray-200/40 transition-all hover:scale-105 hover:shadow-md dark:ring-gray-700/40`}
              >
                <div
                  className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-800/80`}
                >
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-50">
                  {action.label}
                </div>

                {/* Hover effect */}
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-150" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
