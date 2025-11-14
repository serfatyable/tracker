import type { CardTone } from '../ui/Card';

export type ResidentPalette = {
  tone: CardTone;
  heroClass: string;
  heroOverlay: string;
  heroText: string;
  accentChip: string;
  accentBadge: string;
  accentButton: string;
  rosterStripe: string;
  rosterBackground: string;
};

const PALETTES: ResidentPalette[] = [
  {
    tone: 'emerald',
    heroClass:
      'bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white shadow-[0_25px_60px_-20px_rgba(16,185,129,0.65)]',
    heroOverlay: 'bg-emerald-400/30',
    heroText: 'text-white',
    accentChip: 'bg-emerald-500/15 text-emerald-50 ring-1 ring-emerald-100/40',
    accentBadge: 'bg-white/15 text-white ring-1 ring-white/30',
    accentButton:
      'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/70 dark:hover:bg-white/20 dark:text-white',
    rosterStripe: 'bg-gradient-to-b from-emerald-400 to-teal-500',
    rosterBackground:
      'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/15 hover:from-emerald-500/20 hover:to-emerald-500/30',
  },
  {
    tone: 'violet',
    heroClass:
      'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white shadow-[0_25px_60px_-20px_rgba(168,85,247,0.6)]',
    heroOverlay: 'bg-fuchsia-400/30',
    heroText: 'text-white',
    accentChip: 'bg-violet-500/15 text-violet-50 ring-1 ring-violet-200/40',
    accentBadge: 'bg-white/15 text-white ring-1 ring-white/30',
    accentButton:
      'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/70 dark:hover:bg-white/20 dark:text-white',
    rosterStripe: 'bg-gradient-to-b from-fuchsia-400 to-indigo-500',
    rosterBackground:
      'bg-gradient-to-br from-violet-500/10 via-fuchsia-500/6 to-indigo-500/14 hover:from-violet-500/20 hover:to-indigo-500/30',
  },
  {
    tone: 'sky',
    heroClass:
      'bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 text-white shadow-[0_25px_60px_-20px_rgba(14,165,233,0.6)]',
    heroOverlay: 'bg-sky-400/30',
    heroText: 'text-white',
    accentChip: 'bg-sky-500/15 text-sky-50 ring-1 ring-sky-200/40',
    accentBadge: 'bg-white/15 text-white ring-1 ring-white/30',
    accentButton:
      'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/70 dark:hover:bg-white/20 dark:text-white',
    rosterStripe: 'bg-gradient-to-b from-sky-400 to-indigo-500',
    rosterBackground:
      'bg-gradient-to-br from-sky-500/10 via-indigo-500/6 to-sky-500/14 hover:from-sky-500/20 hover:to-indigo-500/30',
  },
  {
    tone: 'rose',
    heroClass:
      'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white shadow-[0_25px_60px_-20px_rgba(244,114,182,0.55)]',
    heroOverlay: 'bg-rose-400/30',
    heroText: 'text-white',
    accentChip: 'bg-rose-500/15 text-rose-50 ring-1 ring-rose-200/40',
    accentBadge: 'bg-white/15 text-white ring-1 ring-white/30',
    accentButton:
      'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/70 dark:hover:bg-white/20 dark:text-white',
    rosterStripe: 'bg-gradient-to-b from-rose-400 to-amber-400',
    rosterBackground:
      'bg-gradient-to-br from-rose-500/12 via-pink-500/8 to-rose-500/16 hover:from-rose-500/20 hover:to-amber-400/30',
  },
  {
    tone: 'amber',
    heroClass:
      'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-900 shadow-[0_25px_60px_-20px_rgba(245,158,11,0.55)]',
    heroOverlay: 'bg-amber-300/30',
    heroText: 'text-slate-900',
    accentChip: 'bg-amber-400/20 text-amber-900 ring-1 ring-amber-300/50',
    accentBadge: 'bg-black/10 text-slate-900 ring-1 ring-black/10 dark:bg-white/10 dark:text-white',
    accentButton:
      'bg-black/10 text-slate-900 hover:bg-black/15 focus-visible:ring-black/40 dark:bg-white/15 dark:text-white dark:hover:bg-white/20',
    rosterStripe: 'bg-gradient-to-b from-amber-400 to-orange-500',
    rosterBackground:
      'bg-gradient-to-br from-amber-500/12 via-orange-500/8 to-amber-500/18 hover:from-amber-500/20 hover:to-orange-500/30',
  },
  {
    tone: 'slate',
    heroClass:
      'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-slate-100 shadow-[0_25px_60px_-20px_rgba(15,23,42,0.55)]',
    heroOverlay: 'bg-slate-500/30',
    heroText: 'text-slate-100',
    accentChip: 'bg-slate-500/20 text-slate-100 ring-1 ring-slate-400/40',
    accentBadge: 'bg-white/10 text-white ring-1 ring-white/20',
    accentButton: 'bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/60',
    rosterStripe: 'bg-gradient-to-b from-slate-500 to-slate-700',
    rosterBackground:
      'bg-gradient-to-br from-slate-900/10 via-slate-700/8 to-slate-900/16 hover:from-slate-900/20 hover:to-slate-700/30',
  },
];

function computeIndex(seed?: string | null): number {
  if (!seed) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % PALETTES.length;
}

export function getResidentPalette(seed?: string | null): ResidentPalette {
  const fallback = PALETTES[0]!;
  return PALETTES[computeIndex(seed)] ?? fallback;
}
