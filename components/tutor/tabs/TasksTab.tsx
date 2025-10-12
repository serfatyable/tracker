'use client';
import { useMemo, useState } from 'react';
import type { TaskDoc } from '../../../lib/firebase/db';
import type { UserProfile } from '../../../types/auth';
import Button from '../../ui/Button';
import Select from '../../ui/Select';

type Props = {
  residents: UserProfile[];
  tasks: TaskDoc[];
  onBulkApprove: (ids: string[]) => Promise<void>;
  onBulkReject: (ids: string[], reason?: string) => Promise<void>;
};

export default function TasksTab({ residents, tasks, onBulkApprove, onBulkReject }: Props) {
  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const groups = useMemo(() => {
    const map = new Map<string, TaskDoc[]>();
    for (const t of tasks) {
      const arr = map.get(t.userId) || [];
      arr.push(t);
      map.set(t.userId, arr);
    }
    return map;
  }, [tasks]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');

  const selectedIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm opacity-70">Selected: {selectedIds.length}</div>
        <div className="flex items-center gap-2">
          <input
            className="rounded border px-2 py-1 text-sm bg-transparent"
            placeholder="Optional rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button onClick={() => onBulkApprove(selectedIds)} disabled={selectedIds.length === 0}>
            Approve
          </Button>
          <Button
            variant="secondary"
            onClick={() => onBulkReject(selectedIds, reason)}
            disabled={selectedIds.length === 0}
          >
            Reject
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from(groups.entries()).map(([uid, list]) => {
          const r = resById.get(uid);
          return (
            <div key={uid} className="glass-card card-levitate p-3">
              <div className="font-semibold mb-2">{(r && r.fullName) || uid}</div>
              <div className="space-y-2">
                {list.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center justify-between text-sm border rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
                  >
                    <div>
                      <div className="font-medium">
                        {t.itemId}{' '}
                        <span className="opacity-70">
                          ({t.count}/{t.requiredCount})
                        </span>
                      </div>
                      <div className="text-xs opacity-70">Rotation: {t.rotationId}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!sel[t.id]}
                      onChange={(e) => setSel((s) => ({ ...s, [t.id]: e.target.checked }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
