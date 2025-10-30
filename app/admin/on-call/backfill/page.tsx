'use client';

import { useState } from 'react';

import AppShell from '../../../../components/layout/AppShell';
import Card from '../../../../components/ui/Card';
import { fetchWithAuth } from '../../../../lib/api/client';
import { useCurrentUserProfile } from '../../../../lib/hooks/useCurrentUserProfile';

export default function AdminOnCallBackfillPage() {
  const { data: me } = useCurrentUserProfile();
  const [month, setMonth] = useState('2025-11');
  const [deltaDays, setDeltaDays] = useState(1);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (dryRun: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const url = `/api/on-call/backfill?mode=dateShift&month=${encodeURIComponent(
        month,
      )}&deltaDays=${encodeURIComponent(String(deltaDays))}${dryRun ? '&dryRun=true' : ''}`;
      const res = await fetchWithAuth(url, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Request failed');
      } else {
        setResult(json);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const disabled = me?.role !== 'admin';

  return (
    <AppShell>
      <div className="app-container p-4 space-y-4">
        <h1 className="text-xl font-semibold">On-Call Backfill (Admin)</h1>
        <Card className="space-y-3">
          <div className="text-sm">
            Fix off-by-one date issue by shifting records forward by N days.
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <div className="mb-1">Month (YYYY-MM)</div>
              <input
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border rounded px-2 py-1"
                placeholder="2025-11"
              />
            </label>
            <label className="block text-sm">
              <div className="mb-1">Delta days</div>
              <input
                type="number"
                value={deltaDays}
                onChange={(e) => setDeltaDays(parseInt(e.target.value || '1', 10))}
                className="border rounded px-2 py-1 w-24"
                min={-7}
                max={7}
              />
            </label>
            <div className="flex gap-2">
              <button
                className="pill"
                onClick={() => run(true)}
                disabled={loading || disabled}
                aria-busy={loading}
              >
                Dry run
              </button>
              <button
                className="pill bg-red-600 text-white hover:bg-red-700"
                onClick={() => run(false)}
                disabled={loading || disabled}
                aria-busy={loading}
              >
                Execute
              </button>
            </div>
          </div>
          {disabled ? <div className="text-sm text-red-600">Admin access required.</div> : null}
          {error ? <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre> : null}
          {result ? (
            <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
