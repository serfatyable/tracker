'use client';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type Props = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
};

export default function PasswordInput({
  id,
  value,
  onChange,
  label,
  required,
  disabled,
  autoComplete,
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium" suppressHydrationWarning>
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className="input-levitate pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/90 hover:bg-white/10 hover:text-white"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <EyeSlashIcon className="h-5 w-5" aria-hidden />
          ) : (
            <EyeIcon className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
