'use client';

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  OrphanedAuthAccount,
  OrphanedFirestoreDoc,
  SyncResponse,
} from '../../../app/api/admin/users/sync/route';
import { TableSkeleton } from '../../dashboard/Skeleton';
import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import Toast from '../../ui/Toast';

export default function AccountSyncView() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'auth' | 'firestore' | null>(null);
  const [deleteUids, setDeleteUids] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const fetchSyncData = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin/users/sync', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sync data');
      }

      const syncData = (await response.json()) as SyncResponse;
      setData(syncData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncData();
  }, [fetchSyncData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSyncData();
  };

  const handleDeleteClick = (type: 'auth' | 'firestore', uids: string[]) => {
    setDeleteType(type);
    setDeleteUids(uids);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteType || deleteUids.length === 0) return;

    setDeleting(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin/users/sync', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type: deleteType, uids: deleteUids }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete orphaned accounts');
      }

      const result = await response.json();

      if (result.success) {
        setToast({
          message: t('ui.orphansDeleted', {
            defaultValue: `Successfully deleted ${result.deleted.length} orphaned account(s)`,
            count: result.deleted.length,
          }),
          variant: 'success',
        });
      } else {
        setToast({
          message: t('ui.orphansDeletedPartial', {
            defaultValue: `Deleted ${result.deleted.length} account(s) with ${result.errors.length} error(s)`,
            deleted: result.deleted.length,
            errors: result.errors.length,
          }),
          variant: 'error',
        });
      }

      // Refresh data
      await fetchSyncData();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete orphaned accounts',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteType(null);
      setDeleteUids([]);
    }
  };

  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
        <p className="text-gray-600 dark:text-gray-400">
          {t('ui.noSyncData', { defaultValue: 'No sync data available' })}
        </p>
      </div>
    );
  }

  const totalAccounts = data.inSync + data.orphanedAuth.length + data.orphanedFirestore.length;

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('ui.accountSync', { defaultValue: 'Account Sync' })}
        </h2>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="secondary"
          className="inline-flex items-center gap-2"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('ui.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Synced Users */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted">
                {t('ui.syncedUsers', { defaultValue: 'Synced Users' })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{data.inSync}</p>
              <p className="text-xs text-muted">
                {totalAccounts > 0
                  ? `${Math.round((data.inSync / totalAccounts) * 100)}% of total`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>

        {/* Orphaned Auth Accounts */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted">
                {t('ui.orphanedAuth', { defaultValue: 'Orphaned Auth' })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {data.orphanedAuth.length}
              </p>
              <p className="text-xs text-muted">
                {t('ui.noFirestoreDoc', { defaultValue: 'No Firestore document' })}
              </p>
            </div>
          </div>
        </div>

        {/* Orphaned Firestore Docs */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted">
                {t('ui.orphanedFirestore', { defaultValue: 'Orphaned Data' })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {data.orphanedFirestore.length}
              </p>
              <p className="text-xs text-muted">
                {t('ui.noAuthAccount', { defaultValue: 'No Auth account' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orphaned Auth Accounts Table */}
      {data.orphanedAuth.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {t('ui.orphanedAuthAccounts', { defaultValue: 'Orphaned Auth Accounts' })}
            </h3>
            <Button
              onClick={() => handleDeleteClick('auth', data.orphanedAuth.map((a) => a.uid))}
              variant="destructive"
              size="sm"
              className="inline-flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              {t('ui.deleteAll', { defaultValue: 'Delete All' })}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.email', { defaultValue: 'Email' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    UID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.createdAt', { defaultValue: 'Created' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.lastSignIn', { defaultValue: 'Last Sign In' })}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.actions', { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {data.orphanedAuth.map((account) => (
                  <tr key={account.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                      {account.email || (
                        <span className="text-muted italic">
                          {t('ui.noEmail', { defaultValue: 'No email' })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-muted">{account.uid}</td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {account.lastSignInTime
                        ? new Date(account.lastSignInTime).toLocaleDateString()
                        : t('ui.never', { defaultValue: 'Never' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Button
                        onClick={() => handleDeleteClick('auth', [account.uid])}
                        variant="destructive"
                        size="sm"
                      >
                        {t('ui.delete', { defaultValue: 'Delete' })}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orphaned Firestore Docs Table */}
      {data.orphanedFirestore.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {t('ui.orphanedFirestoreDocs', { defaultValue: 'Orphaned User Data' })}
            </h3>
            <Button
              onClick={() => handleDeleteClick('firestore', data.orphanedFirestore.map((d) => d.uid))}
              variant="destructive"
              size="sm"
              className="inline-flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              {t('ui.deleteAll', { defaultValue: 'Delete All' })}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.name', { defaultValue: 'Name' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.email', { defaultValue: 'Email' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.role', { defaultValue: 'Role' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    UID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                    {t('ui.actions', { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {data.orphanedFirestore.map((doc) => (
                  <tr key={doc.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                      {doc.fullName || (
                        <span className="text-muted italic">
                          {t('ui.noName', { defaultValue: 'No name' })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">{doc.email}</td>
                    <td className="px-4 py-3 text-sm text-muted capitalize">{doc.role}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted">{doc.uid}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Button
                        onClick={() => handleDeleteClick('firestore', [doc.uid])}
                        variant="destructive"
                        size="sm"
                      >
                        {t('ui.delete', { defaultValue: 'Delete' })}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Orphans Message */}
      {data.orphanedAuth.length === 0 && data.orphanedFirestore.length === 0 && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-6 text-center">
          <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
          <p className="text-green-800 dark:text-green-200 font-medium">
            {t('ui.allAccountsSynced', {
              defaultValue: 'All accounts are synced! No orphaned accounts found.',
            })}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader>
          {t('ui.confirmDelete', { defaultValue: 'Confirm Deletion' })}
        </DialogHeader>
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300">
            {deleteUids.length === 1
              ? t('ui.confirmDeleteOrphan', {
                  defaultValue: 'Are you sure you want to delete this orphaned account?',
                })
              : t('ui.confirmDeleteOrphans', {
                  defaultValue: `Are you sure you want to delete ${deleteUids.length} orphaned accounts?`,
                  count: deleteUids.length,
                })}
          </p>
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            {t('ui.orphanWarning', {
              defaultValue:
                'This action cannot be undone. This will permanently delete the authentication data or user profile.',
            })}
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="secondary"
            disabled={deleting}
          >
            {t('ui.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleDeleteConfirm} variant="destructive" disabled={deleting}>
            {deleting
              ? t('ui.deleting', { defaultValue: 'Deleting...' })
              : t('ui.delete', { defaultValue: 'Delete' })}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClear={() => setToast(null)}
        />
      )}
    </div>
  );
}
