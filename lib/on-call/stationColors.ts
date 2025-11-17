import type { StationKey } from '@/types/onCall';

/**
 * Color scheme for each station type
 * Using Tailwind CSS utility classes for consistency across light/dark modes
 */
export const stationColors: Record<
  StationKey,
  {
    bg: string; // Background color class
    border: string; // Border color class
    text: string; // Text color class
    badge: string; // Badge/pill color classes
  }
> = {
  // Critical care stations - Red/Pink tones
  icu: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-900 dark:text-red-100',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  },
  // Operating rooms - Blue tones
  or_main: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-900 dark:text-blue-100',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  },
  or_gyne: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/20',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-900 dark:text-cyan-100',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  },
  senior_or: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-900 dark:text-indigo-100',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  },
  senior_or_half: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-900 dark:text-indigo-100',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  },
  // Obstetrics - Purple tones
  labor_delivery: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-900 dark:text-purple-100',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  },
  // Recovery - Green tones
  pacu: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-900 dark:text-green-100',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
  // Management - Amber tones
  on_call_manager: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-900 dark:text-amber-100',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  },
  // Orthopedics - Orange tones
  ortho_shatzi: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-900 dark:text-orange-100',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  },
  ortho_trauma: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-900 dark:text-orange-100',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  },
  ortho_joint: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-900 dark:text-orange-100',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  },
  // Specialty services - Pink/Rose tones
  surgery: {
    bg: 'bg-pink-50 dark:bg-pink-950/20',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-900 dark:text-pink-100',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
  },
  urology: {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20',
    border: 'border-fuchsia-300 dark:border-fuchsia-700',
    text: 'text-fuchsia-900 dark:text-fuchsia-100',
    badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-200',
  },
  // Spine/pain - Teal tones
  spine: {
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-900 dark:text-teal-100',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  },
  spine_injections: {
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-900 dark:text-teal-100',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  },
  pain_service: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-900 dark:text-emerald-100',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  // Vascular - Violet tones
  vascular_thoracic: {
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-300 dark:border-violet-700',
    text: 'text-violet-900 dark:text-violet-100',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
  },
  // Day off - Gray tones
  weekly_day_off: {
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-900 dark:text-gray-100',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
  },
};

/**
 * Get color classes for a station
 */
export function getStationColors(stationKey: StationKey) {
  return stationColors[stationKey];
}

/**
 * Get badge/pill classes for a station
 */
export function getStationBadgeClasses(stationKey: StationKey): string {
  const colors = stationColors[stationKey];
  return `${colors.badge} px-2 py-1 rounded-full text-xs font-medium`;
}

/**
 * Get card classes for a station
 */
export function getStationCardClasses(
  stationKey: StationKey,
  isHighlighted: boolean = false,
): string {
  const colors = stationColors[stationKey];
  const baseClasses = 'rounded border p-3';

  if (isHighlighted) {
    return `${baseClasses} ${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-blue-500`;
  }

  return `${baseClasses} ${colors.bg} ${colors.border}`;
}
