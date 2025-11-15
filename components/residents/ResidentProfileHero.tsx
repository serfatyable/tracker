import { CheckCircleIcon, EnvelopeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

import type { ResidentPalette } from './residentPalette';

type Props = {
  fullName: string;
  email?: string | null;
  programLabel?: string | null;
  residencyStartLabel: string;
  residencyEndLabel: string;
  activeRotationName?: string | null;
  tutorNames: string[];
  palette: ResidentPalette;
  rotationProgressPct: number;
  pendingTasks: number;
  onApproveAll?: () => void;
  approvingAll?: boolean;
};

export default function ResidentProfileHero({
  fullName,
  email,
  programLabel,
  residencyStartLabel,
  residencyEndLabel,
  activeRotationName,
  tutorNames,
  palette,
  rotationProgressPct,
  pendingTasks,
  onApproveAll,
  approvingAll,
}: Props) {
  const accentText = palette.heroText.includes('slate-') ? 'text-slate-800/90' : 'text-white/80';

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-3xl p-6 text-sm transition md:p-8',
        palette.heroClass,
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 opacity-40 blur-3xl transition-all duration-700',
          palette.heroOverlay,
        )}
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="relative inline-flex items-center justify-center">
            <div
              className="absolute -inset-1 rounded-full bg-white/20 blur-lg"
              aria-hidden="true"
            />
            <div className="relative rounded-full border border-white/30 bg-black/20 p-1 backdrop-blur">
              <Avatar
                size={76}
                name={fullName}
                email={email || undefined}
                className="text-lg font-semibold text-white shadow-inner"
              />
            </div>
          </div>
          <div className="space-y-3 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {fullName}
              </h1>
              {programLabel ? (
                <Badge className={clsx('uppercase tracking-wide', palette.accentBadge)}>
                  {programLabel}
                </Badge>
              ) : null}
            </div>
            <p className={clsx('flex items-center gap-2 text-xs sm:text-sm', accentText)}>
              {email || '—'}
            </p>
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 sm:text-sm">
              <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-2 backdrop-blur-sm">
                <dt className="font-semibold text-white/80">Residency start</dt>
                <dd className="text-white/90">{residencyStartLabel}</dd>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-2 backdrop-blur-sm">
                <dt className="font-semibold text-white/80">Projected completion</dt>
                <dd className="text-white/90">{residencyEndLabel}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 sm:text-sm">
              <span className="rounded-full bg-black/20 px-3 py-1 font-medium backdrop-blur-sm">
                {activeRotationName || 'No active rotation'}
              </span>
              {tutorNames.map((name) => (
                <span
                  key={name}
                  className={clsx(
                    'rounded-full px-3 py-1 font-medium backdrop-blur-sm',
                    palette.accentChip,
                  )}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-left text-xs uppercase tracking-wide text-white/80 sm:text-sm">
            <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-white/70">
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                Progress
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">{rotationProgressPct}%</div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white/90 transition-all"
                  style={{ width: `${rotationProgressPct}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-white/70">
                <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                Pending tasks
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">{pendingTasks}</div>
              <p className="mt-1 text-[12px] font-medium text-white/70">Ready for your approval</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {email ? (
              <Button
                variant="ghost"
                onClick={() => window.open(`mailto:${email}`, '_blank')}
                className={clsx(
                  'rounded-full px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm',
                  palette.accentButton,
                )}
                leftIcon={<EnvelopeIcon className="h-4 w-4" aria-hidden="true" />}
              >
                Message resident
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={onApproveAll}
              disabled={!pendingTasks || approvingAll}
              loading={approvingAll}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm',
                palette.accentButton,
                (!pendingTasks || approvingAll) && 'opacity-60',
              )}
              leftIcon={<CheckCircleIcon className="h-4 w-4" aria-hidden="true" />}
            >
              Approve all pending
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
