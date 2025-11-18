'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

import Input from './Input';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
};

export default function TextField({
  label,
  helpText,
  error,
  id,
  required,
  className,
  disabled,
  ...rest
}: Props) {
  const inputId = id || `tf-${Math.random().toString(36).slice(2, 8)}`;
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errId = error ? `${inputId}-err` : undefined;
  const ariaDesc = [helpId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-fg">
          {label}
          {required ? <span className="ms-1 text-red-600">*</span> : null}
        </label>
      ) : null}
      <Input
        id={inputId}
        aria-describedby={ariaDesc}
        aria-invalid={!!error}
        aria-required={required}
        className={[
          'placeholder:text-[rgb(var(--fg))] dark:placeholder:text-white/70',
          error ? 'ring-1 ring-red-500' : 'focus:ring-1 focus:ring-primary',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
        disabled={disabled}
        {...rest}
      />
      {helpText ? (
        <p id={helpId} className="mt-1 text-xs text-muted">
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
