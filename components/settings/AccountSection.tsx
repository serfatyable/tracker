'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteAccountDialog from './DeleteAccountDialog';

import { deleteUserAccount } from '@/lib/firebase/auth';

export default function AccountSection() {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteAccount = async (password: string) => {
    await deleteUserAccount(password);
    // User will be redirected after deletion due to auth state change
    if (typeof window !== 'undefined') {
      window.location.replace('/auth');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {t('settings.account.title')}
      </h2>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
          {t('settings.account.dangerZone')}
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-3">
          {t('settings.account.deleteDescription')}
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30 text-sm"
        >
          {t('settings.account.deleteAccount')}
        </button>
      </div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
