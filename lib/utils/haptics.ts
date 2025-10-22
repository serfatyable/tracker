export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function canVibrate(): boolean {
  try {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
  } catch {
    return false;
  }
}

export function haptic(style: HapticStyle = 'light') {
  if (!canVibrate()) return;
  try {
    const pattern =
      style === 'light'
        ? 10
        : style === 'medium'
          ? [15, 30, 15]
          : style === 'heavy'
            ? [25, 40, 25]
            : style === 'success'
              ? [10, 20, 10]
              : style === 'warning'
                ? [20, 40, 20]
                : [30, 50, 30];
    // @ts-ignore - vibrate may not exist on all platforms
    navigator.vibrate?.(pattern as any);
  } catch {
    /* noop */
  }
}


