'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TopBar from '../../../components/TopBar';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';
import { getCurrentUserWithProfile } from '../../../lib/firebase/auth';

export default function AdminMorningMeetingsImportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { firebaseUser, profile } = await getCurrentUserWithProfile();
        if (!firebaseUser) return router.replace('/auth');
        if (!profile || profile.status === 'pending') return router.replace('/awaiting-approval');
        if (profile.role !== 'admin') return router.replace('/auth');
      } catch (error) {
        console.error('Failed to check user profile:', error);
        router.replace('/auth');
      }
    })();
  }, [router]);

  async function onImport() {
    setErrors([]);
    setImporting(true);
    try {
      // ✅ SECURE: Use authenticated fetch with Bearer token
      const { fetchWithAuth } = await import('../../../lib/api/client');
      const res = await fetchWithAuth('/api/morning-meetings/import', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
        body: csvText,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data?.errors || [data?.error || 'Import failed']);
      } else {
        setToast(`Imported ${data.imported}`);
        setCsvText('');
      }
    } catch (e: any) {
      setErrors([String(e?.message || e)]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <TopBar />
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <Toast message={toast} onClear={() => setToast(null)} />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('morningMeetings.title')}</h1>
          <a
            className="btn-levitate"
            href="/api/templates/morning-meetings.csv"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('ui.downloadTemplate')}
          </a>
        </div>
        <div className="card-levitate p-4 space-y-3">
          <div className="text-sm opacity-70">
            Paste CSV content (single month). Columns: date,title,lecturer,organizer,link,notes
          </div>
          <textarea
            className="w-full h-64 border rounded p-2 font-mono text-sm"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'date,title,lecturer,organizer,link,notes\n01/11/2025,Topic,...'}
          />
          {errors.length ? (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={onImport} disabled={importing || !csvText.trim()}>
              {t('ui.importFromCsv')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
