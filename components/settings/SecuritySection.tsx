'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateUserPassword } from '@/lib/firebase/auth';

interface SecuritySectionProps {
  onToast: (message: string) => void;
}

export default function SecuritySection({ onToast }: SecuritySectionProps) {
  const { t } = useTranslation();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      onToast(t('settings.security.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      onToast(t('settings.security.passwordMismatch'));
      return;
    }

    try {
      setLoading(true);
      await updateUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
      onToast(t('settings.security.passwordUpdated'));
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        onToast(t('settings.security.incorrectPassword'));
      } else {
        onToast(t('settings.security.passwordUpdateError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {t('settings.security.title')}
      </h2>

      {changingPassword ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
              {t('settings.security.currentPassword')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-levitate w-full"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
              {t('settings.security.newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-levitate w-full"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
              {t('settings.security.confirmNewPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-levitate w-full"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('settings.saving') : t('settings.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setChangingPassword(false);
              }}
              disabled={loading}
              className="btn-levitate border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 text-sm"
            >
              {t('settings.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChangingPassword(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('settings.security.changePassword')}
        </button>
      )}
    </div>
  );
}
