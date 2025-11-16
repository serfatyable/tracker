'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocalized } from '../../lib/i18n/getLocalized';
import type { RotationNode } from '../../types/rotations';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
  item: RotationNode | null;
  onLog: (item: RotationNode) => void;
};

export default function ItemDetailSheet({ open, onClose, item, onLog }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en';

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!open) return;

    // Save previous overflow values
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    // Lock scroll on both body and html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // Restore previous values
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  if (!open || !item) return null;

  const approved = 0; // TODO: Get from props or context
  const required = item.requiredCount || 0;
  const isComplete = required > 0 && approved >= required;

  const handleLog = () => {
    onLog(item);
    onClose();
  };

  // Build links array: MCQ first if exists, then item.links
  const links: Array<{
    href: string;
    label?: string;
    label_en?: string;
    label_he?: string;
    kind?: 'mcq' | 'link';
  }> = [];
  if (item?.mcqUrl)
    links.push({ href: item.mcqUrl, label_en: 'MCQ', label_he: 'שאלות', kind: 'mcq' });
  if (Array.isArray(item?.links)) links.push(...(item!.links as any));
  const showLinks = links.length > 0;
  const freeTextResources = (item as any)?.resources;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 sheet-max-h grid grid-rows-[auto,1fr] pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
      >
        {/* Row 1: Header */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2
                id="item-detail-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words"
              >
                {item.name}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-xs font-bold ${
                    isComplete
                      ? '!bg-green-100 !text-green-800 dark:!bg-green-900/60 dark:!text-green-200'
                      : approved > 0
                        ? '!bg-amber-100 !text-amber-800 dark:!bg-amber-900/60 dark:!text-amber-200'
                        : '!bg-red-100 !text-red-800 dark:!bg-red-900/60 dark:!text-red-200'
                  }`}
                  aria-label={`${approved} of ${required} approved`}
                >
                  {approved}/{required}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {/* TODO: Show domain from item */}
                  General
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={t('ui.close', { defaultValue: 'Close' })}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: Content */}
        <div
          className="min-h-0 scroll-y-touch scrollbar-stable pb-safe px-4 py-4"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Resources section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('ui.resources', { defaultValue: 'Resources' })}
            </h3>
            {freeTextResources ? (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 text-sm whitespace-pre-wrap">
                {freeTextResources}
              </div>
            ) : null}
            {showLinks ? (
              <div className="space-y-2">
                {links.map((link, idx) => {
                  const label =
                    (getLocalized<string>({
                      en: (link as any).label_en ?? link.label,
                      he: (link as any).label_he ?? link.label,
                      lang: lang as any,
                      fallback: undefined,
                    }) as string) || new URL(link.href).hostname.replace(/^www\./, '');
                  return (
                    <a
                      key={idx}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {link.href}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : !freeTextResources ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {t('ui.noResources', { defaultValue: 'No resources yet' })}
              </div>
            ) : null}
          </div>

          {/* Description/Notes section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('ui.notes', { defaultValue: 'Notes' })}
            </h3>
            {(() => {
              const notes = getLocalized<string>({
                en: (item as any)?.notes_en,
                he: (item as any)?.notes_he,
                lang: lang as any,
                fallback: '',
              });
              return notes ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {t('ui.noDescription', { defaultValue: 'No description available' })}
                </div>
              );
            })()}
          </div>

          {/* Actions section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleLog} className="w-full" size="lg">
              {t('ui.logActivity', { defaultValue: 'Log activity' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
