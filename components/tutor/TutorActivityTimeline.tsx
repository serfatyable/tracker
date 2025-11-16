'use client';

import {
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  AcademicCapIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';

type ActivityType = 'approval' | 'rejection' | 'assignment' | 'milestone' | 'reflection';

type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

type Props = {
  activities?: Activity[];
};

// Mock activities for demonstration - replace with real data
function getMockActivities(t: any): Activity[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'approval',
      title: t('tutor.timeline.approvedTask'),
      description: 'Sarah Cohen - ICU Procedures',
      timestamp: new Date(now.getTime() - 1000 * 60 * 15), // 15 minutes ago
      icon: CheckCircleIcon,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: '2',
      type: 'reflection',
      title: t('tutor.timeline.submittedReflection'),
      description: 'Airway Management - Resident: David Levi',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: AcademicCapIcon,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
    {
      id: '3',
      type: 'approval',
      title: t('tutor.timeline.approvedTask'),
      description: 'Michael Ben-David - OR Skills',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
      icon: CheckCircleIcon,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: '4',
      type: 'assignment',
      title: t('tutor.timeline.newAssignment'),
      description: 'Rachel Mizrahi assigned to PACU rotation',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      icon: UserPlusIcon,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
    {
      id: '5',
      type: 'rejection',
      title: t('tutor.timeline.rejectedTask'),
      description: 'Yossi Katz - Incomplete documentation',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      icon: XCircleIcon,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];
}

function formatTimeAgo(date: Date, language: string): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return language === 'he' ? 'עכשיו' : 'just now';
  }

  if (diffInMinutes < 60) {
    return language === 'he'
      ? `לפני ${diffInMinutes} דקות`
      : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return language === 'he'
      ? `לפני ${diffInHours} שעות`
      : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return language === 'he'
      ? `לפני ${diffInDays} ימים`
      : `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  return language === 'he'
    ? `לפני ${diffInWeeks} שבועות`
    : `${diffInWeeks}w ago`;
}

export default function TutorActivityTimeline({ activities: providedActivities }: Props) {
  const { t, i18n } = useTranslation();

  const activities = providedActivities || getMockActivities(t);

  if (!activities.length) {
    return (
      <Card
        tone="violet"
        variant="tinted"
        title={t('tutor.timeline.title')}
        subtitle={t('tutor.timeline.subtitle')}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20">
            <ClockIcon className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {t('tutor.timeline.noActivity')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      tone="violet"
      variant="tinted"
      title={t('tutor.timeline.title')}
      subtitle={t('tutor.timeline.subtitle')}
    >
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-gradient-to-b from-violet-400/40 via-violet-300/30 to-transparent dark:from-violet-500/40 dark:via-violet-400/30" />

        {/* Activities */}
        <div className="space-y-6">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            const isLast = index === activities.length - 1;

            return (
              <div key={activity.id} className="relative flex gap-4 pb-2">
                {/* Icon */}
                <div className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${activity.bgColor} ring-4 ring-white dark:ring-slate-900`}>
                  <Icon className={`h-5 w-5 ${activity.color}`} />
                </div>

                {/* Content */}
                <div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
                  <div className="rounded-lg bg-white/60 p-4 shadow-sm ring-1 ring-gray-200/60 backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md dark:bg-slate-800/40 dark:ring-gray-700/60 dark:hover:bg-slate-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-50">
                          {activity.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {activity.description}
                        </p>
                      </div>
                      <time className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {formatTimeAgo(activity.timestamp, i18n.language)}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
