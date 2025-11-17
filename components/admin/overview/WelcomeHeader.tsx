'use client';

import { SunIcon, MoonIcon, CloudIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  userName?: string;
  pendingActions: number;
  activeResidents: number;
  totalRotations: number;
};

function getTimeBasedGreeting(): {
  greeting: string;
  icon: typeof SunIcon;
  gradientClass: string;
} {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'goodMorning',
      icon: SunIcon,
      gradientClass: 'from-amber-400 via-orange-400 to-yellow-500',
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: 'goodAfternoon',
      icon: CloudIcon,
      gradientClass: 'from-sky-400 via-blue-400 to-indigo-500',
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      greeting: 'goodEvening',
      icon: MoonIcon,
      gradientClass: 'from-indigo-500 via-purple-500 to-pink-500',
    };
  } else {
    return {
      greeting: 'goodNight',
      icon: MoonIcon,
      gradientClass: 'from-indigo-700 via-purple-700 to-blue-900',
    };
  }
}

export default function WelcomeHeader({
  userName,
  pendingActions,
  activeResidents,
  totalRotations,
}: Props): React.ReactElement {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { greeting, icon: Icon, gradientClass } = getTimeBasedGreeting();

  // Format today's date based on language
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat(i18n.language === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-8 shadow-lg transition-all duration-700 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      {/* Gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-90 dark:opacity-70`}
      />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Icon className="h-8 w-8 text-white" aria-hidden />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white">
              {t(`dashboard.${greeting}`, { defaultValue: 'Welcome' })}
              {userName && (
                <>
                  ,{' '}
                  <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    {userName}
                  </span>
                </>
              )}
            </h1>
            <p className="text-white/90 text-sm mt-1">{dateFormatter.format(today)}</p>
          </div>
        </div>

        {/* Quick summary */}
        <div className="flex flex-wrap gap-6 mt-6 text-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-medium">
              {pendingActions} {t('dashboard.pendingActions', { defaultValue: 'pending actions' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/80" />
            <span className="text-sm font-medium">
              {activeResidents}{' '}
              {t('dashboard.activeResidents', { defaultValue: 'active residents' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <span className="text-sm font-medium">
              {totalRotations} {t('dashboard.rotations', { defaultValue: 'rotations' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
