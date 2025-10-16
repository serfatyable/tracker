'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cleanupDuplicateNodes, fixInvalidRequiredCounts } from '../../../lib/firebase/admin';
import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  rotationId: string;
  rotationName: string;
};

export default function MaintenanceDialog({ open, onClose, rotationId, rotationName }: Props) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{
    duplicates?: { found: number; deleted: number; details: any[] };
    invalidCounts?: { fixed: number; details: any[] };
  } | null>(null);

  async function runCleanup() {
    setRunning(true);
    setResults(null);

    try {
      // Fix invalid required counts first
      const invalidCountsResult = await fixInvalidRequiredCounts(rotationId);

      // Then clean up duplicates
      const duplicatesResult = await cleanupDuplicateNodes(rotationId);

      setResults({
        duplicates: {
          found: duplicatesResult.duplicatesFound,
          deleted: duplicatesResult.nodesDeleted,
          details: duplicatesResult.details,
        },
        invalidCounts: {
          fixed: invalidCountsResult.nodesFixed,
          details: invalidCountsResult.details,
        },
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <span>🔧</span>
          <span>Database Maintenance: {rotationName}</span>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-4">
        <div className="rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10 p-4">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            ⚠️ Maintenance Operations
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            This will perform the following cleanup operations:
          </p>
          <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc list-inside space-y-1">
            <li>Fix any negative or invalid required counts (set to 0)</li>
            <li>Detect and remove duplicate nodes (keep the one with highest required count)</li>
          </ul>
        </div>

        {results && (
          <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10 p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              ✅ Cleanup Complete
            </h3>

            <div className="space-y-3 text-sm">
              {/* Invalid Counts */}
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">
                  Invalid Required Counts Fixed: {results.invalidCounts?.fixed || 0}
                </div>
                {results.invalidCounts && results.invalidCounts.fixed > 0 && (
                  <ul className="ml-4 mt-1 space-y-1 text-green-800 dark:text-green-200">
                    {results.invalidCounts.details.map((d, i) => (
                      <li key={i}>
                        <strong>{d.name}</strong>: {d.oldValue} → {d.newValue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Duplicates */}
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">
                  Duplicate Groups Found: {results.duplicates?.found || 0}
                </div>
                <div className="font-medium text-green-900 dark:text-green-100">
                  Nodes Deleted: {results.duplicates?.deleted || 0}
                </div>
                {results.duplicates && results.duplicates.found > 0 && (
                  <ul className="ml-4 mt-1 space-y-1 text-green-800 dark:text-green-200">
                    {results.duplicates.details.map((d, i) => (
                      <li key={i}>
                        <strong>{d.name}</strong>: Kept {d.kept.slice(0, 8)}, Deleted{' '}
                        {d.deleted.length} duplicate(s)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {results.invalidCounts?.fixed === 0 && results.duplicates?.found === 0 && (
                <div className="text-green-800 dark:text-green-200">
                  No issues found! This rotation is clean. 🎉
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={running}>
          {results ? t('ui.close') : t('ui.cancel')}
        </Button>
        {!results && (
          <Button
            onClick={runCleanup}
            disabled={running}
            loading={running}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {running ? 'Running Cleanup...' : 'Run Cleanup'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
