// Shift type configuration for on-call scheduling
// Contains shift types, icons, colors, and helper functions

// Allowed shift types for filtering
export const ALLOWED_SHIFT_TYPES = [
  'PACU',
  'טיפול נמרץ',
  'מנהל תורן',
  'תורן שליש',
  'כונן',
  'חדר לידה',
  'חנ בכיר',
  'חדר ניתוח',
  'חדר ניתוח נשים',
];

// Shift type icon and color mapping
export const SHIFT_TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  PACU: {
    icon: '🛏️',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  'טיפול נמרץ': {
    icon: '🏥',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700',
  },
  'מנהל תורן': {
    icon: '⭐',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
  },
  'תורן שליש': {
    icon: '🌙',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
  },
  כונן: {
    icon: '📱',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
  },
  'חדר לידה': {
    icon: '👶',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-300 dark:border-pink-700',
  },
  'חנ בכיר': {
    icon: '🎖️',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
  },
  'חדר ניתוח': {
    icon: '🔪',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  'חדר ניתוח נשים': {
    icon: '⚕️',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-300 dark:border-green-700',
  },
};

/**
 * Get shift configuration with fallback for unmapped shift types
 * @param shiftType The shift type to look up
 * @returns Configuration object with icon, color, bgColor, and borderColor
 */
export function getShiftConfig(shiftType: string) {
  // Direct match
  if (SHIFT_TYPE_CONFIG[shiftType]) return SHIFT_TYPE_CONFIG[shiftType];

  // Check for partial matches
  const upperType = shiftType.toUpperCase();
  for (const [key, config] of Object.entries(SHIFT_TYPE_CONFIG)) {
    if (upperType.includes(key.toUpperCase()) || key.toUpperCase().includes(upperType)) {
      return config;
    }
  }

  // Default fallback
  return {
    icon: '👤',
    color: 'text-gray-700 dark:text-[rgb(var(--fg))]',
    bgColor: 'bg-gray-50 dark:bg-[rgb(var(--surface-depressed))]',
    borderColor: 'border-gray-300 dark:border-[rgb(var(--border))]',
  };
}
