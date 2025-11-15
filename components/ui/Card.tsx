'use client';

import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export type CardTone =
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'violet'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'slate';

export type CardVariant = 'default' | 'tinted' | 'solid';

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tone?: CardTone;
  variant?: CardVariant;
};

type StyleOverrides = {
  section?: string;
  header?: string;
  content?: string;
  title?: string;
  subtitle?: string;
};

const BASE_SECTION =
  'rounded-lg bg-bg text-fg ring-1 ring-muted/12 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_20px_-6px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.14)]';
const BASE_HEADER = 'flex items-start justify-between gap-3 border-b border-muted/15 p-4';
const BASE_CONTENT = 'p-4';
const BASE_TITLE = 'text-base font-semibold leading-6 text-foreground dark:text-white';
const BASE_SUBTITLE = 'mt-1 text-sm text-muted';

const TONE_MAP: Record<CardTone, { tinted: StyleOverrides; solid: StyleOverrides }> = {
  emerald: {
    tinted: {
      section:
        'bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-teal-500/20 text-emerald-950 dark:text-emerald-50 ring-emerald-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_45px_-20px_rgba(16,185,129,0.6)]',
      header: 'border-emerald-500/30',
      title: 'text-emerald-900 dark:text-emerald-50',
      subtitle: 'text-emerald-800/80 dark:text-emerald-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white shadow-xl ring-emerald-400/40',
      header: 'border-white/20',
      title: 'text-white',
      subtitle: 'text-emerald-100/90',
    },
  },
  teal: {
    tinted: {
      section:
        'bg-gradient-to-br from-teal-500/12 via-cyan-500/5 to-sky-500/15 text-teal-900 dark:text-teal-100 ring-teal-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_45px_-20px_rgba(13,148,136,0.55)]',
      header: 'border-teal-400/30',
      title: 'text-teal-900 dark:text-teal-50',
      subtitle: 'text-teal-800/80 dark:text-teal-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white shadow-xl ring-teal-400/40',
      header: 'border-white/20',
      title: 'text-white',
      subtitle: 'text-teal-100/90',
    },
  },
  sky: {
    tinted: {
      section:
        'bg-gradient-to-br from-sky-500/12 via-indigo-500/6 to-sky-400/18 text-sky-950 dark:text-sky-100 ring-sky-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_45px_-20px_rgba(14,165,233,0.55)]',
      header: 'border-sky-400/30',
      title: 'text-sky-900 dark:text-sky-50',
      subtitle: 'text-sky-800/80 dark:text-sky-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 text-white shadow-xl ring-sky-400/40',
      header: 'border-white/20',
      title: 'text-white',
      subtitle: 'text-sky-100/90',
    },
  },
  violet: {
    tinted: {
      section:
        'bg-gradient-to-br from-violet-500/14 via-fuchsia-500/10 to-indigo-500/18 text-violet-950 dark:text-violet-100 ring-violet-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_45px_-20px_rgba(139,92,246,0.55)]',
      header: 'border-violet-400/35',
      title: 'text-violet-900 dark:text-violet-50',
      subtitle: 'text-violet-800/80 dark:text-violet-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white shadow-xl ring-violet-400/40',
      header: 'border-white/25',
      title: 'text-white',
      subtitle: 'text-fuchsia-100/90',
    },
  },
  indigo: {
    tinted: {
      section:
        'bg-gradient-to-br from-indigo-500/14 via-blue-500/8 to-purple-500/18 text-indigo-50 ring-indigo-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_45px_-20px_rgba(79,70,229,0.55)]',
      header: 'border-indigo-300/35',
      title: 'text-white',
      subtitle: 'text-indigo-100/90',
    },
    solid: {
      section:
        'bg-gradient-to-r from-indigo-500 via-purple-500 to-slate-600 text-white shadow-xl ring-indigo-400/45',
      header: 'border-white/25',
      title: 'text-white',
      subtitle: 'text-indigo-100/90',
    },
  },
  amber: {
    tinted: {
      section:
        'bg-gradient-to-br from-amber-500/18 via-orange-500/10 to-yellow-500/18 text-amber-950 dark:text-amber-50 ring-amber-500/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_45px_-20px_rgba(245,158,11,0.55)]',
      header: 'border-amber-400/40',
      title: 'text-amber-900 dark:text-amber-50',
      subtitle: 'text-amber-800/80 dark:text-amber-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-900 shadow-xl ring-amber-400/40',
      header: 'border-black/10 dark:border-white/20',
      title: 'text-slate-900 dark:text-slate-900',
      subtitle: 'text-amber-900/80 dark:text-amber-900/70',
    },
  },
  rose: {
    tinted: {
      section:
        'bg-gradient-to-br from-rose-500/20 via-pink-500/12 to-amber-400/18 text-rose-950 dark:text-rose-50 ring-rose-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_45px_-20px_rgba(244,114,182,0.55)]',
      header: 'border-rose-400/35',
      title: 'text-rose-900 dark:text-rose-50',
      subtitle: 'text-rose-800/80 dark:text-rose-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white shadow-xl ring-rose-400/45',
      header: 'border-white/25',
      title: 'text-white',
      subtitle: 'text-rose-100/90',
    },
  },
  slate: {
    tinted: {
      section:
        'bg-gradient-to-br from-slate-900/10 via-slate-700/5 to-slate-900/18 text-slate-900 dark:text-slate-100 ring-slate-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_-18px_rgba(15,23,42,0.45)]',
      header: 'border-slate-400/25',
      title: 'text-slate-900 dark:text-slate-50',
      subtitle: 'text-slate-800/80 dark:text-slate-200/80',
    },
    solid: {
      section:
        'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-slate-100 shadow-xl ring-slate-500/45',
      header: 'border-white/15',
      title: 'text-white',
      subtitle: 'text-slate-200/85',
    },
  },
};

function getOverrides(tone?: CardTone, variant: CardVariant = 'default'): StyleOverrides {
  if (!tone || variant === 'default') {
    return {};
  }
  return TONE_MAP[tone]?.[variant] ?? {};
}

export default function Card({
  title,
  subtitle,
  actions,
  className,
  children,
  tone,
  variant = 'default',
  ...rest
}: Props) {
  const overrides = getOverrides(tone, variant);

  const sectionClass = clsx(BASE_SECTION, overrides.section, className);
  const headerClass = clsx(BASE_HEADER, overrides.header);
  const titleClass = clsx(BASE_TITLE, overrides.title);
  const subtitleClass = clsx(BASE_SUBTITLE, overrides.subtitle);
  const contentClass = clsx(BASE_CONTENT, overrides.content);

  return (
    <section className={sectionClass} {...rest}>
      {(title || actions || subtitle) && (
        <header className={headerClass}>
          <div>
            {title ? <h2 className={titleClass}>{title}</h2> : null}
            {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={contentClass}>{children}</div>
    </section>
  );
}
