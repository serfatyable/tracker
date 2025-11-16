'use client';

import { SparklesIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import type { UserProfile } from '@/types/auth';

type Props = {
  user: UserProfile | null;
  pendingCount: number;
  residentsCount: number;
  completionRate: number;
};

function getTimeBasedGreeting(language: string): string {
  const hour = new Date().getHours();

  if (language === 'he') {
    if (hour < 12) return 'בוקר טוב';
    if (hour < 18) return 'צהריים טובים';
    if (hour < 22) return 'ערב טוב';
    return 'לילה טוב';
  }

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

const MOTIVATIONAL_QUOTES = {
  en: [
    "Great teachers inspire growth in others.",
    "Your guidance shapes future physicians.",
    "Every task reviewed is a lesson shared.",
    "Teaching is the art of awakening curiosity.",
    "Your feedback lights the path forward.",
  ],
  he: [
    "מורים נהדרים מעוררים צמיחה באחרים.",
    "ההדרכה שלך מעצבת רופאים עתידיים.",
    "כל משימה שנבדקה היא שיעור משותף.",
    "הוראה היא אמנות העוררת סקרנות.",
    "המשוב שלך מאיר את הדרך קדימה.",
  ],
};

function getRandomQuote(language: string): string {
  const quotes = language === 'he' ? MOTIVATIONAL_QUOTES.he : MOTIVATIONAL_QUOTES.en;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export default function TutorHeroSection({ user, pendingCount, residentsCount, completionRate }: Props) {
  const { t, i18n } = useTranslation();
  const greeting = getTimeBasedGreeting(i18n.language);
  const quote = getRandomQuote(i18n.language);
  const displayName = i18n.language === 'he' && user?.fullNameHe ? user.fullNameHe : user?.fullName || '';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/12 via-cyan-500/8 to-sky-500/15 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_50px_-20px_rgba(13,148,136,0.5)] ring-1 ring-teal-400/20 dark:from-teal-500/20 dark:via-cyan-500/15 dark:to-sky-500/25 dark:ring-teal-400/30">
      {/* Background decorative elements */}
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-gradient-to-br from-sky-400/20 to-teal-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-24 translate-y-24 rounded-full bg-gradient-to-tr from-cyan-400/15 to-sky-400/15 blur-3xl" />

      <div className="relative z-10">
        {/* Greeting */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg">
            <AcademicCapIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-teal-900 dark:text-teal-50">
              {greeting}{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-teal-700/90 dark:text-teal-200/80">
              <SparklesIcon className="h-4 w-4" />
              {quote}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/60 p-4 backdrop-blur-sm ring-1 ring-teal-500/20 transition hover:bg-white/80 dark:bg-slate-800/40 dark:ring-teal-400/30 dark:hover:bg-slate-800/60">
            <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
              {t('tutor.hero.pendingItems')}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-teal-900 dark:text-teal-50">{pendingCount}</div>
              {pendingCount > 0 && (
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t('tutor.hero.needsAttention')}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white/60 p-4 backdrop-blur-sm ring-1 ring-sky-500/20 transition hover:bg-white/80 dark:bg-slate-800/40 dark:ring-sky-400/30 dark:hover:bg-slate-800/60">
            <div className="text-sm font-medium text-sky-700 dark:text-sky-300">
              {t('tutor.hero.assignedResidents')}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-sky-900 dark:text-sky-50">{residentsCount}</div>
              <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                {t('tutor.hero.residents')}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/60 p-4 backdrop-blur-sm ring-1 ring-emerald-500/20 transition hover:bg-white/80 dark:bg-slate-800/40 dark:ring-emerald-400/30 dark:hover:bg-slate-800/60">
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {t('tutor.hero.completionRate')}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-50">
                {completionRate}%
              </div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t('tutor.hero.average')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
