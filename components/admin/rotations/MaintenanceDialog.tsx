'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cleanupDuplicateNodes, fixInvalidRequiredCounts } from '../../../lib/firebase/admin';
import { trackAdminEvent } from '../../../lib/telemetry';
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
  const [action, setAction] = useState<'preview' | 'cleanup' | null>(null);
  const [preview, setPreview] = useState<{
    duplicates?: { found: number; deleted: number; details: any[] };
    invalidCounts?: { fixed: number; details: any[] };
  } | null>(null);
  const [results, setResults] = useState<{
    duplicates?: { found: number; deleted: number; details: any[] };
    invalidCounts?: { fixed: number; details: any[] };
  } | null>(null);

  async function runPreview() {
    setRunning(true);
    setAction('preview');
    try {
      const invalidCountsResult = await fixInvalidRequiredCounts(rotationId, { dryRun: true });
      const duplicatesResult = await cleanupDuplicateNodes(rotationId, { dryRun: true });
      setPreview({
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
      trackAdminEvent('rotation_maintenance_preview', {
        rotationId,
        duplicatesFound: duplicatesResult.duplicatesFound,
        nodesDeleted: duplicatesResult.nodesDeleted,
        invalidFixed: invalidCountsResult.nodesFixed,
      });
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Preview failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRunning(false);
      setAction(null);
    }
  }

  async function runCleanup() {
    setRunning(true);
    setAction('cleanup');
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
      trackAdminEvent('rotation_maintenance_cleanup', {
        rotationId,
        duplicatesRemoved: duplicatesResult.nodesDeleted,
        duplicateGroups: duplicatesResult.duplicatesFound,
        invalidFixed: invalidCountsResult.nodesFixed,
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRunning(false);
      setAction(null);
    }
  }

  function downloadReport(data: unknown, filename: string) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report', error);
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
            <div className="pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadReport(
                    { rotationId, preview, results },
                    `rotation-${rotationId}-maintenance.json`,
                  )
                }
              >
                {t('rotationTree.exportReport', { defaultValue: 'Download report' })}
              </Button>
            </div>
          </div>
        )}

        {!results && preview && (
          <div className="rounded-lg border-2 border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-900/10 p-4">
            <h3 className="font-semibold text-sky-900 dark:text-sky-100 mb-2">
              {t('rotationTree.previewSummary', {
                defaultValue: 'Preview summary (no changes yet)',
              })}
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-sky-900 dark:text-sky-100">
                  {t('rotationTree.previewInvalid', {
                    defaultValue: 'Invalid required counts detected: {{count}}',
                    count: preview.invalidCounts?.fixed || 0,
                  })}
                </div>
                {preview.invalidCounts && preview.invalidCounts.fixed > 0 && (
                  <ul className="ml-4 mt-1 space-y-1 text-sky-800 dark:text-sky-200">
                    {preview.invalidCounts.details.slice(0, 5).map((d, i) => (
                      <li key={i}>
                        <strong>{d.name}</strong>: {d.oldValue} → {d.newValue}
                      </li>
                    ))}
                    {preview.invalidCounts.details.length > 5 ? <li>…</li> : null}
                  </ul>
                )}
              </div>
              <div>
                <div className="font-medium text-sky-900 dark:text-sky-100">
                  {t('rotationTree.previewDuplicates', {
                    defaultValue: 'Duplicate groups detected: {{count}}',
                    count: preview.duplicates?.found || 0,
                  })}
                </div>
                <div className="font-medium text-sky-900 dark:text-sky-100">
                  {t('rotationTree.previewDuplicateNodes', {
                    defaultValue: 'Nodes that would be removed: {{count}}',
                    count: preview.duplicates?.deleted || 0,
                  })}
                </div>
                {preview.duplicates && preview.duplicates.found > 0 && (
                  <ul className="ml-4 mt-1 space-y-1 text-sky-800 dark:text-sky-200">
                    {preview.duplicates.details.slice(0, 5).map((d, i) => (
                      <li key={i}>
                        <strong>{d.name}</strong>: {d.deleted.length}{' '}
                        {t('rotationTree.previewDuplicatesDeleted', {
                          defaultValue: 'marked duplicates',
                        })}
                      </li>
                    ))}
                    {preview.duplicates.details.length > 5 ? <li>…</li> : null}
                  </ul>
                )}
              </div>
            </div>
            <div className="pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadReport(
                    { rotationId, preview },
                    `rotation-${rotationId}-maintenance-preview.json`,
                  )
                }
              >
                {t('rotationTree.exportPreview', { defaultValue: 'Download preview' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={running}>
          {results ? t('ui.close') : t('ui.cancel')}
        </Button>
        {!results && (
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={runPreview}
              disabled={running}
              loading={running && action === 'preview'}
            >
              {running && action === 'preview'
                ? t('rotationTree.previewing', { defaultValue: 'Previewing…' })
                : t('rotationTree.previewAction', { defaultValue: 'Preview cleanup' })}
            </Button>
            <Button
              onClick={runCleanup}
              disabled={running}
              loading={running && action === 'cleanup'}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {running && action === 'cleanup'
                ? t('rotationTree.runningCleanup', { defaultValue: 'Running cleanup…' })
                : t('rotationTree.runCleanup', { defaultValue: 'Run cleanup' })}
            </Button>
          </div>
        )}
      </DialogFooter>
    </Dialog>
  );
}
