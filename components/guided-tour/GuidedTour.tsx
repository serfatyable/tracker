'use client';

import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center';

type Step = {
  id: string;
  title: string;
  description: string;
  target?: string;
  placement?: Placement;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const STORAGE_KEY = 'tracker-guided-tour-complete';

declare global {
  interface WindowEventMap {
    'tracker:guided-tour': CustomEvent<{ action: 'start' }>;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeTooltipStyle(rect: Rect | null, placement: Placement): CSSProperties {
  if (typeof window === 'undefined') {
    return {};
  }
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const offset = 16;

  if (!rect || placement === 'center') {
    return {
      top: viewportHeight / 2,
      left: viewportWidth / 2,
      transform: 'translate(-50%, -50%)',
    };
  }

  let top = rect.top;
  let left = rect.left;
  let transform = 'translate(-50%, -50%)';

  switch (placement) {
    case 'bottom':
      top = rect.top + rect.height + offset;
      left = rect.left + rect.width / 2;
      transform = 'translate(-50%, 0)';
      break;
    case 'top':
      top = rect.top - offset;
      left = rect.left + rect.width / 2;
      transform = 'translate(-50%, -100%)';
      break;
    case 'left':
      top = rect.top + rect.height / 2;
      left = rect.left - offset;
      transform = 'translate(-100%, -50%)';
      break;
    case 'right':
      top = rect.top + rect.height / 2;
      left = rect.left + rect.width + offset;
      transform = 'translate(0, -50%)';
      break;
    default:
      top = rect.top + rect.height + offset;
      left = rect.left + rect.width / 2;
      transform = 'translate(-50%, 0)';
      break;
  }

  top = clamp(top, 40, viewportHeight - 40);
  left = clamp(left, 40, viewportWidth - 40);

  return {
    top,
    left,
    transform,
  };
}

export default function GuidedTour() {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const instanceId = useId();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const steps: Step[] = useMemo(
    () => [
      {
        id: 'welcome',
        title: t('guidedTour.steps.welcome.title', {
          defaultValue: 'Welcome to Tracker',
        }) as string,
        description:
          (t('guidedTour.steps.welcome.description', {
            defaultValue:
              'This quick tour highlights the essentials so you can move from orientation to action.',
          }) as string) || '',
        placement: 'center',
      },
      {
        id: 'topbar',
        title: t('guidedTour.steps.topBar.title', { defaultValue: 'Stay oriented' }) as string,
        description:
          (t('guidedTour.steps.topBar.description', {
            defaultValue:
              'Open the main menu, switch languages, and keep up with reminders from the top bar.',
          }) as string) || '',
        target: '[data-tour="topbar"]',
        placement: 'bottom',
      },
      {
        id: 'command',
        title: t('guidedTour.steps.command.title', { defaultValue: 'Search everything' }) as string,
        description:
          (t('guidedTour.steps.command.description', {
            defaultValue: 'Use the command palette button or press ⌘K to jump anywhere in the app.',
          }) as string) || '',
        target: '[data-tour="command-button"]',
        placement: 'bottom',
      },
      {
        id: 'roles',
        title: t('guidedTour.steps.roleTabs.title', { defaultValue: 'Switch workflows' }) as string,
        description:
          (t('guidedTour.steps.roleTabs.description', {
            defaultValue:
              'Role-based tabs keep rotations, meetings, exams, and settings one click away.',
          }) as string) || '',
        target: '[data-tour="role-tabs"]',
        placement: 'top',
      },
      {
        id: 'quick-actions',
        title: t('guidedTour.steps.quickActions.title', {
          defaultValue: 'Act on priorities',
        }) as string,
        description:
          (t('guidedTour.steps.quickActions.description', {
            defaultValue: 'Quick actions surface common next steps and your curated favorites.',
          }) as string) || '',
        target: '[data-tour="quick-actions"]',
        placement: 'top',
      },
    ],
    [t],
  );

  const updateRect = useCallback(() => {
    if (!isRunning) {
      setRect(null);
      return;
    }
    const current = steps[stepIndex];
    if (!current || !current.target || typeof document === 'undefined') {
      setRect(null);
      return;
    }
    const el = document.querySelector(current.target) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const bounds = el.getBoundingClientRect();
    if (bounds.width < 1 && bounds.height < 1) {
      setRect(null);
      return;
    }
    setRect({
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
    });
  }, [isRunning, stepIndex, steps]);

  useEffect(() => {
    if (!isRunning) return;
    updateRect();
    if (typeof window === 'undefined') return;
    const onResize = () => updateRect();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isRunning, updateRect, stepIndex]);

  useEffect(() => {
    if (!isRunning || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isRunning]);

  const finishTour = useCallback(() => {
    setIsRunning(false);
    setStepIndex(0);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((prev) => {
      if (prev >= steps.length - 1) {
        finishTour();
        return prev;
      }
      return prev + 1;
    });
  }, [finishTour, steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  useEffect(() => {
    if (!isClient) return;
    let timer: number | null = null;
    try {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        timer = window.setTimeout(() => {
          setStepIndex(0);
          setIsRunning(true);
        }, 800);
      }
    } catch {
      // ignore storage failures
    }
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    const handler = (event: WindowEventMap['tracker:guided-tour']) => {
      if (event?.detail?.action === 'start') {
        setStepIndex(0);
        setIsRunning(true);
      }
    };
    window.addEventListener('tracker:guided-tour', handler);
    return () => {
      window.removeEventListener('tracker:guided-tour', handler);
    };
  }, [isClient]);

  useEffect(() => {
    if (!isRunning || typeof window === 'undefined') return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finishTour();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [finishTour, goBack, goNext, isRunning]);

  if (!isClient || !isRunning) {
    return null;
  }

  const activeStep = steps[stepIndex];
  const tooltipStyle = computeTooltipStyle(rect, activeStep?.placement || 'bottom');
  const isLastStep = stepIndex === steps.length - 1;
  const titleId = `${instanceId}-title-${activeStep?.id}`;
  const descId = `${instanceId}-description-${activeStep?.id}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="presentation">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={skipTour} />
      {activeStep?.target && rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-sky-300/80 shadow-[0_0_40px_rgba(14,165,233,0.6)]"
          style={{
            top: rect.top - 12,
            left: rect.left - 12,
            width: rect.width + 24,
            height: rect.height + 24,
            transition: 'top 150ms ease, left 150ms ease, width 150ms ease, height 150ms ease',
          }}
        />
      ) : null}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="absolute w-full max-w-sm"
        style={{
          top: typeof tooltipStyle.top === 'number' ? `${tooltipStyle.top}px` : tooltipStyle.top,
          left:
            typeof tooltipStyle.left === 'number' ? `${tooltipStyle.left}px` : tooltipStyle.left,
          transform: tooltipStyle.transform,
        }}
      >
        <div className="pointer-events-auto rounded-2xl bg-[rgb(var(--surface-elevated,255,255,255))] p-5 text-[rgb(var(--fg,17,24,39))] shadow-2xl ring-1 ring-black/10 dark:bg-[rgb(var(--surface-elevated))] dark:text-[rgb(var(--fg))]">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-500">
            {t('guidedTour.progress', {
              defaultValue: 'Step {{current}} of {{total}}',
              current: stepIndex + 1,
              total: steps.length,
            })}
          </p>
          <h2 id={titleId} className="mt-2 text-lg font-semibold">
            {activeStep?.title}
          </h2>
          <p id={descId} className="mt-2 text-sm text-[rgb(var(--fg-muted,100,116,139))]">
            {activeStep?.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={skipTour}
            >
              {t('guidedTour.controls.skip', { defaultValue: 'Skip' })}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-gray-300 px-4 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={goBack}
                disabled={stepIndex === 0}
              >
                {t('guidedTour.controls.back', { defaultValue: 'Back' })}
              </button>
              <button
                type="button"
                className="rounded-full bg-sky-600 px-4 py-1 text-sm font-semibold text-white transition hover:bg-sky-500"
                onClick={isLastStep ? finishTour : goNext}
              >
                {isLastStep
                  ? t('guidedTour.controls.finish', { defaultValue: 'Finish' })
                  : t('guidedTour.controls.next', { defaultValue: 'Next' })}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
