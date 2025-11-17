'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import PasswordConfirmDialog from './PasswordConfirmDialog';

import { updateUserEmail, updateUserProfile } from '@/lib/firebase/auth';
import { sanitizeContentStrict } from '@/lib/utils/sanitize';
import type { UserProfile } from '@/types/auth';

interface ProfileSectionProps {
  profile: UserProfile;
  onUpdate: () => void;
  onToast: (message: string) => void;
}

export default function ProfileSection({ profile, onUpdate, onToast }: ProfileSectionProps) {
  const { t } = useTranslation();

  // Email editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(profile.email || '');
  const [showEmailPasswordDialog, setShowEmailPasswordDialog] = useState(false);

  // Name editing
  const [editingNames, setEditingNames] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [fullNameHe, setFullNameHe] = useState(profile.fullNameHe || '');

  // Residency date editing (only for residents)
  const [editingResidencyDate, setEditingResidencyDate] = useState(false);
  const [residencyStartDate, setResidencyStartDate] = useState(
    profile.role === 'resident' ? profile.residencyStartDate : '',
  );

  const handleEmailSave = () => {
    if (!newEmail.trim() || newEmail === profile.email) {
      setEditingEmail(false);
      return;
    }
    setShowEmailPasswordDialog(true);
  };

  const handleEmailUpdate = async (password: string) => {
    await updateUserEmail(newEmail, password);
    setEditingEmail(false);
    onUpdate();
    onToast(t('settings.profile.emailUpdated'));
  };

  const handleNamesSave = async () => {
    try {
      await updateUserProfile({ fullName, fullNameHe });
      setEditingNames(false);
      onUpdate();
      onToast(t('settings.profile.namesUpdated'));
    } catch {
      onToast(t('settings.profile.updateError'));
    }
  };

  const handleResidencyDateSave = async () => {
    try {
      await updateUserProfile({ residencyStartDate });
      setEditingResidencyDate(false);
      onUpdate();
      onToast(t('settings.profile.residencyDateUpdated'));
    } catch {
      onToast(t('settings.profile.updateError'));
    }
  };

  const isResidencyDateValid = (date: string) => {
    if (!date) return false;
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate <= today;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {t('settings.profile.title')}
      </h2>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
          {t('settings.profile.email')}
        </label>
        {editingEmail ? (
          <div className="space-y-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="input-levitate w-full"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEmailSave}
                className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30 text-sm"
              >
                {t('settings.save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewEmail(profile.email || '');
                  setEditingEmail(false);
                }}
                className="btn-levitate border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 text-sm"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-gray-900 dark:text-gray-50">{profile.email || '—'}</span>
            <button
              type="button"
              onClick={() => setEditingEmail(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('settings.edit')}
            </button>
          </div>
        )}
      </div>

      {/* Full Names */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
          {t('settings.profile.fullName')}
        </label>
        {editingNames ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('settings.profile.fullNameEnglish')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-levitate w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('settings.profile.fullNameHebrew')}
              </label>
              <input
                type="text"
                value={fullNameHe}
                onChange={(e) => setFullNameHe(e.target.value)}
                className="input-levitate w-full"
                dir="rtl"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNamesSave}
                className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30 text-sm"
              >
                {t('settings.save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFullName(profile.fullName || '');
                  setFullNameHe(profile.fullNameHe || '');
                  setEditingNames(false);
                }}
                className="btn-levitate border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 text-sm"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.profile.fullNameEnglish')}:
              </span>
              <span className="text-gray-900 dark:text-gray-50">
                {profile.fullName ? sanitizeContentStrict(profile.fullName) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.profile.fullNameHebrew')}:
              </span>
              <span className="text-gray-900 dark:text-gray-50" dir="rtl">
                {profile.fullNameHe ? sanitizeContentStrict(profile.fullNameHe) : '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditingNames(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('settings.edit')}
            </button>
          </div>
        )}
      </div>

      {/* Residency Start Date (only for residents) */}
      {profile.role === 'resident' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
            {t('settings.profile.residencyStartDate')}
          </label>
          {editingResidencyDate ? (
            <div className="space-y-2">
              <input
                type="date"
                value={residencyStartDate}
                onChange={(e) => setResidencyStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="input-levitate w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResidencyDateSave}
                  disabled={!isResidencyDateValid(residencyStartDate)}
                  className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('settings.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResidencyStartDate(profile.residencyStartDate);
                    setEditingResidencyDate(false);
                  }}
                  className="btn-levitate border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 text-sm"
                >
                  {t('settings.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-gray-900 dark:text-gray-50">{residencyStartDate || '—'}</span>
              <button
                type="button"
                onClick={() => setEditingResidencyDate(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('settings.edit')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Password Confirm Dialog for Email */}
      <PasswordConfirmDialog
        open={showEmailPasswordDialog}
        onClose={() => setShowEmailPasswordDialog(false)}
        onConfirm={handleEmailUpdate}
        title={t('settings.profile.confirmEmailChange')}
        description={t('settings.profile.confirmEmailChangeDesc')}
      />
    </div>
  );
}
