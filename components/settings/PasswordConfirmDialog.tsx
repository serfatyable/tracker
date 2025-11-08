'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog';

interface PasswordConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  title: string;
  description: string;
}

export default function PasswordConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: PasswordConfirmDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t('settings.security.passwordRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t('settings.security.incorrectPassword'));
      } else {
        setError(t('settings.security.authError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>{title}</DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
            {t('settings.security.currentPassword')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-levitate w-full"
            autoFocus
            disabled={loading}
          />
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
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
            disabled={loading || !password.trim()}
            className="btn-levitate border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('settings.confirming') : t('settings.confirm')}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
