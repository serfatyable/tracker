'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export default function DeleteAccountDialog({
  open,
  onClose,
  onConfirm,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmValid = confirmText === 'DELETE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmValid) {
      setError(t('settings.account.deleteTypeMismatch'));
      return;
    }
    if (!password.trim()) {
      setError(t('settings.security.passwordRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(password);
      // Don't reset or close - the account deletion will redirect
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t('settings.security.incorrectPassword'));
      } else {
        setError(t('settings.account.deleteError'));
      }
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <DialogHeader>{t('settings.account.deleteAccountTitle')}</DialogHeader>
        </div>

        <div className="mt-4 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-2">
              {t('settings.account.deleteWarning')}
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
              <li>{t('settings.account.deleteWarning1')}</li>
              <li>{t('settings.account.deleteWarning2')}</li>
              <li>{t('settings.account.deleteWarning3')}</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
              {t('settings.account.deleteConfirmLabel')}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="input-levitate w-full font-mono"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('settings.account.deleteConfirmHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
              {t('settings.security.currentPassword')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-levitate w-full"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn-levitate border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('settings.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !isConfirmValid || !password.trim()}
            className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('settings.account.deleting') : t('settings.account.deleteAccount')}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
