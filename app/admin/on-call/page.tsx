'use client';
import { useEffect, useMemo, useState } from 'react';
import TopBar from '../../../components/TopBar';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { getCurrentUserWithProfile } from '../../../lib/firebase/auth';
import { useUsersByRole } from '../../../lib/hooks/useUsersByRole';

type Unresolved = { dateKey: string; stationKey: string; name: string };

export default function AdminOnCallImportPage() {
  const { t } = useTranslation();
  const [csvText, setCsvText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ assignments: number; unresolved: Unresolved[] } | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, string>>({}); // rawName (lower) -> userId
  const { residents, tutors } = useUsersByRole();

  useEffect(() => {
    (async () => {
      const { firebaseUser, profile } = await getCurrentUserWithProfile();
      if (!firebaseUser) return (window.location.href = '/auth');
      if (!profile || profile.status === 'pending') return (window.location.href = '/awaiting-approval');
      if (profile.role !== 'admin') return (window.location.href = '/auth');
    })();
  }, []);

  const activeUsers = useMemo(() => {
    return [...residents, ...tutors].map((u) => ({ id: (u as any).uid, name: (u as any).fullName || (u as any).email }));
  }, [residents, tutors]);

  async function doDryRun() {
    setErrors([]);
    setImporting(true);
    try {
      const { firebaseUser } = await getCurrentUserWithProfile();
      const res = await fetch('/api/on-call/import?dryRun=1', {
        method: 'POST',
        headers: { 'content-type': 'text/plain; charset=utf-8', 'x-user-uid': firebaseUser?.uid || '' },
        body: csvText,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data?.errors || [data?.error || 'Dry run failed']);
        setPreview(null);
      } else {
        setPreview(data.preview || null);
      }
    } catch (e: any) {
      setErrors([String(e?.message || e)]);
    } finally {
      setImporting(false);
    }
  }

  async function doCommit() {
    setErrors([]);
    setImporting(true);
    try {
      const { firebaseUser } = await getCurrentUserWithProfile();
      const res = await fetch('/api/on-call/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8', 'x-user-uid': firebaseUser?.uid || '' },
        body: JSON.stringify({ csv: csvText, resolutions, saveAliases: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data?.errors || [data?.error || 'Import failed']);
      } else {
        setToast(`Imported ${data.imported}`);
        setCsvText('');
        setPreview(null);
        setResolutions({});
      }
    } catch (e: any) {
      setErrors([String(e?.message || e)]);
    } finally {
      setImporting(false);
    }
  }

  function setResolution(rawName: string, userId: string) {
    const key = rawName.trim().toLowerCase();
    setResolutions((prev) => ({ ...prev, [key]: userId }));
  }

  return (
    <div>
      <TopBar />
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <Toast message={toast} onClear={() => setToast(null)} />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('ui.onCall', { defaultValue: 'On Call' })}</h1>
          <a className="btn-levitate" href="/api/templates/on-call.csv" target="_blank" rel="noopener noreferrer">
            {t('ui.downloadTemplate')}
          </a>
        </div>
        <div className="glass-card p-4 space-y-3">
          <div className="text-sm opacity-70">CSV with Hebrew headers; one row per date. Paste content below.</div>
          <textarea
            className="w-full h-64 border rounded p-2 font-mono text-sm"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'יום,תאריך,ת.חדר ניתוח,...\nא,01/11/2025,Dr. Jane,...'}
          />
          {errors.length ? (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2 justify-end">
            <Button onClick={doDryRun} disabled={importing || !csvText.trim()}>
              {t('ui.importFromCsv')}
            </Button>
            <Button onClick={doCommit} disabled={importing || !preview}>
              {t('ui.create')}
            </Button>
          </div>
        </div>

        {preview ? (
          <div className="glass-card p-4 space-y-3">
            <div className="font-medium">Preview</div>
            <div className="text-sm">Assignments parsed: {preview.assignments}</div>
            <div className="text-sm">Unresolved names: {preview.unresolved.length}</div>
            {preview.unresolved.length ? (
              <div className="space-y-2">
                {preview.unresolved.map((u, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="min-w-[12ch] font-mono">{u.dateKey}</div>
                    <div className="min-w-[16ch]">{u.stationKey}</div>
                    <div className="flex-1">{u.name}</div>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={resolutions[u.name.toLowerCase()] || ''}
                      onChange={(e) => setResolution(u.name, e.target.value)}
                    >
                      <option value="">Select user…</option>
                      {activeUsers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}


