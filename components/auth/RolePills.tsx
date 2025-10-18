'use client';
import { useTranslation } from 'react-i18next';

import type { Role } from '../../types/auth';

type Props = {
  value: Role;
  onChange: (r: Role) => void;
  disabled?: boolean;
};

export default function RolePills({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const options: Role[] = ['resident', 'tutor', 'admin'];
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={
              'inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ' +
              (selected
                ? 'bg-white text-blue-600 shadow-sm ring-2 ring-blue-500 dark:bg-[rgb(var(--surface))]'
                : 'bg-transparent text-gray-900 hover:bg-blue-50 dark:text-gray-100')
            }
          >
            {t(`roles.${opt}`)}
          </button>
        );
      })}
    </div>
  );
}
