'use client';

import { useTranslation } from 'react-i18next';

import type { Role } from '../../types/auth';

type Props = {
  role: Role;
  onRoleChange: (r: Role) => void;
  language: 'en' | 'he';
  onLanguageChange: (l: 'en' | 'he') => void;
  labels: { role: string; language: string };
  disabled?: boolean;
};

export default function RoleSelect({
  role,
  onRoleChange,
  language,
  onLanguageChange,
  labels,
  disabled,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white">{labels.role}</label>
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as Role)}
          disabled={disabled}
          className="mt-1 input-levitate"
        >
          <option value="resident">{t('roles.resident')}</option>
          <option value="tutor">{t('roles.tutor')}</option>
          <option value="admin">{t('roles.admin')}</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white">{labels.language}</label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as 'en' | 'he')}
          disabled={disabled}
          className="mt-1 input-levitate"
        >
          <option value="en">English</option>
          <option value="he">עברית</option>
        </select>
      </div>
    </div>
  );
}
