'use client';
import { getAuth } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask, listRecentTasksByLeaf } from '../../lib/firebase/db';
import { logError } from '../../lib/utils/logger';
import type { RotationNode } from '../../types/rotations';
import Button from '../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../ui/Dialog';
import EmptyState, { DocumentIcon } from '../ui/EmptyState';
import Input from '../ui/Input';
import Toast from '../ui/Toast';
import { getLocalized } from '../../lib/i18n/getLocalized';

type Props = { leaf: RotationNode | null; canLog: boolean };

export default function LeafDetails({ leaf, canLog }: Props) {
  const { t, i18n } = useTranslation();
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!leaf) {
        setRecent([]);
        return;
      }
      const auth = getAuth(getFirebaseApp());
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      setLoadingRecent(true);
      try {
        const list = await listRecentTasksByLeaf({ userId: uid, itemId: leaf.id, limit: 5 });
        setRecent(list);
      } catch (error) {
        logError('Failed to load recent tasks for leaf', 'LeafDetails', error as Error);
        setRecent([]);
      } finally {
        setLoadingRecent(false);
      }
    })();
  }, [leaf]);

  const required = leaf?.requiredCount || 0;
  const progress = useMemo(() => {
    let approved = 0;
    let pending = 0;
    for (const t of recent) {
      if (t.status === 'approved') approved += t.count || 0;
      else if (t.status === 'pending') pending += t.count || 0;
    }
    return { approved, pending };
  }, [recent]);

  if (!leaf)
    return (
      <div className="rounded-md border border-gray-200 dark:border-[rgb(var(--border))] p-4 text-sm text-gray-600 dark:text-gray-300">
        {t('ui.selectLeaf')}
      </div>
    );

  async function handleLog() {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!leaf) return;
    setSaving(true);
    try {
      await createTask({
        userId: uid,
        rotationId: leaf.rotationId,
        itemId: leaf.id,
        count: count || 1,
        requiredCount: required,
        note: note || undefined,
      });
      setToast(
        t('ui.logSuccess', { defaultValue: 'Activity logged successfully!' }) || 'Logged +1',
      );
      setNote('');
      setCount(1);
      const list = await listRecentTasksByLeaf({ userId: uid, itemId: leaf.id, limit: 5 });
      setRecent(list);
    } catch {
      setToast(
        t('ui.logError', { defaultValue: 'Failed to log activity. Please try again.' }) ||
          'Failed to log',
      );
    } finally {
      setSaving(false);
    }
  }

  const notes = i18n.language === 'he' ? leaf.notes_he : leaf.notes_en;

  return (
    <div className="rounded-md border border-gray-200 dark:border-[rgb(var(--border))] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-lg font-medium text-gray-900 dark:text-gray-50">{
          getLocalized<string>({
            he: (leaf as any).name_he as any,
            en: (leaf as any).name_en as any,
            fallback: leaf.name as any,
            lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
          }) || leaf.name
        }</div>
        {notes ? (
          <button
            onClick={() => setNotesDialogOpen(true)}
            className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full p-1"
            title={t('ui.viewNotes') as string}
            aria-label="View notes"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {t('ui.required')}: {required}
        </div>
        <ProgressBar approved={progress.approved} pending={progress.pending} required={required} />
      </div>
      {leaf.mcqUrl ? (
        <div className="text-sm">
          <a
            className="text-teal-700 underline dark:text-teal-400 dark:hover:text-teal-300"
            href={leaf.mcqUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('ui.mcq')}
          </a>
        </div>
      ) : null}
      {leaf.resources ? (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
            {t('ui.resources')}
          </div>
          <div className="text-sm whitespace-pre-line text-gray-900 dark:text-gray-50">
            <Linkify text={leaf.resources} />
          </div>
        </div>
      ) : null}
      {(leaf.links || []).length ? (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
            {t('ui.links')}
          </div>
          {(leaf.links || []).map((lnk, i) => (
            <div key={i} className="text-sm">
              <a
                className="text-teal-700 underline dark:text-teal-400 dark:hover:text-teal-300"
                href={lnk.href}
                target="_blank"
                rel="noreferrer"
              >
                {getLocalized<string>({
                  he: (lnk as any).label_he as any,
                  en: (lnk as any).label_en as any,
                  fallback: (lnk as any).label as any,
                  lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
                }) || lnk.href}
              </a>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          type="number"
          aria-label="Count"
          value={String(count)}
          onChange={(e) => setCount(Number(e.target.value || 1))}
        />
        <Input
          placeholder={t('ui.optionalNote') as string}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      <div>
        <Button onClick={handleLog} disabled={!canLog || saving}>
          {saving ? t('ui.saving') || 'Saving...' : t('ui.logPlusOne')}
        </Button>
        {!canLog ? (
          <span
            className="ml-2 text-sm text-gray-600 dark:text-gray-300"
            title={t('ui.loggingOnlyInActiveRotation') as string}
          >
            {t('ui.disabled')}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{t('ui.recentLogs') || 'Recent logs'}</div>
        {loadingRecent ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">{t('ui.loadingItems')}</div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon size={36} />}
            title={t('ui.noRecentLogs') || 'No recent logs'}
            description={t('ui.logFirstActivity', {
              defaultValue: 'Log your first activity to track progress.',
            })}
            className="py-4"
          />
        ) : (
          <div className="text-sm text-gray-900 dark:text-gray-50">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1">
                <span>
                  {t.count} · {t.status}
                  {t.note ? ` · ${t.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast message={toast} onClear={() => setToast(null)} />

      <Dialog open={notesDialogOpen} onClose={() => setNotesDialogOpen(false)}>
        <DialogHeader>{t('ui.notes')}</DialogHeader>
        <div className="p-4 space-y-3">
          <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-50">{notes || t('ui.noNotes')}</div>
        </div>
        <DialogFooter>
          <Button onClick={() => setNotesDialogOpen(false)}>{t('ui.close')}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function Linkify({ text }: { text: string }) {
  // Detect URLs and make them clickable
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
              className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
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

function ProgressBar({
  approved,
  pending,
  required,
}: {
  approved: number;
  pending: number;
  required: number;
}) {
  const total = Math.max(required, approved + pending);
  const aPct = total ? Math.round((approved / total) * 100) : 0;
  const pPct = total ? Math.round((pending / total) * 100) : 0;
  return (
    <div className="h-3 w-full rounded bg-gray-100 dark:bg-[rgb(var(--surface-depressed))] overflow-hidden flex">
      <div className="bg-green-500" style={{ width: `${aPct}%` }} />
      <div className="bg-amber-400" style={{ width: `${pPct}%` }} />
    </div>
  );
}
