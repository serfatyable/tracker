'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocalized } from '../../lib/i18n/getLocalized';
import type { RotationNode } from '../../types/rotations';
import Badge from '../ui/Badge';

type Props = {
  open: boolean;
  node: RotationNode | null;
  ancestors: RotationNode[];
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
};

export default function NodeDetailsSheet({ open, node, ancestors, onClose, onSelectNode }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en';

  useEffect(() => {
    if (!open) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  if (!open || !node) return null;

  const localizedName =
    getLocalized<string>({
      en: (node as any).name_en,
      he: (node as any).name_he,
      fallback: node.name,
      lang: lang as any,
    }) || node.name;

  const notes = getLocalized<string>({
    en: (node as any).notes_en,
    he: (node as any).notes_he,
    fallback: '',
    lang: lang as any,
  });

  const mcq = node.mcqUrl?.trim() || '';
  const resources = node.resources?.trim() || '';
  const links = Array.isArray(node.links) ? node.links : [];
  const hasMaterials = Boolean(mcq || resources || links.length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 sheet-max-h grid grid-rows-[auto,1fr] pointer-events-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
                {localizedName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Badge
                  variant="outline"
                  className="text-[11px] uppercase tracking-wide"
                >{`#${node.type}`}</Badge>
                {ancestors.length ? (
                  <nav aria-label={t('ui.breadcrumb', { defaultValue: 'Breadcrumb' }) as string}>
                    <ol className="flex flex-wrap items-center gap-1 text-[11px]">
                      {ancestors.map((ancestor, idx) => (
                        <li key={ancestor.id} className="flex items-center gap-1">
                          {onSelectNode ? (
                            <button
                              type="button"
                              className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              onClick={() => onSelectNode(ancestor.id)}
                            >
                              {ancestor.name}
                            </button>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              {ancestor.name}
                            </span>
                          )}
                          {idx < ancestors.length - 1 ? (
                            <span className="text-[9px]" aria-hidden>
                              ›
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </nav>
                ) : null}
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
        <div
          className="min-h-0 scroll-y-touch scrollbar-stable px-4 py-4 space-y-4"
          style={{ touchAction: 'pan-y' }}
        >
          {hasMaterials ? (
            <div className="space-y-4">
              {mcq ? (
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('ui.mcq', { defaultValue: 'MCQ' })}
                  </div>
                  <a
                    href={mcq}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm text-blue-600 underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {mcq}
                  </a>
                </div>
              ) : null}
              {resources ? (
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('ui.resources', { defaultValue: 'Resources' })}
                  </div>
                  <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100">
                    <Linkify text={resources} />
                  </div>
                </div>
              ) : null}
              {links.length ? (
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('ui.links', { defaultValue: 'Links' })}
                  </div>
                  <div className="mt-2 space-y-2">
                    {links.map((link, idx) => {
                      const label =
                        getLocalized<string>({
                          en: (link as any).label_en ?? link.label,
                          he: (link as any).label_he ?? link.label,
                          lang: lang as any,
                          fallback: undefined,
                        }) || link.href;
                      return (
                        <a
                          key={`${link.href}-${idx}`}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border border-gray-200 bg-white p-3 text-sm text-blue-600 underline transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-gray-700"
                        >
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              {t('rotationTree.noNodeMaterials', {
                defaultValue: 'No materials added for this node yet.',
              })}
            </div>
          )}

          {notes ? (
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('ui.notes', { defaultValue: 'Notes' })}
              </div>
              <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100">
                {notes}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Linkify({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
