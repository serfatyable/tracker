'use client';

import type { ReactNode, TextareaHTMLAttributes } from 'react';

import TextArea from './TextArea';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
};

export default function TextAreaField({
  label,
  helpText,
  error,
  id,
  required,
  className,
  disabled,
  ...rest
}: Props) {
  const areaId = id || `ta-${Math.random().toString(36).slice(2, 8)}`;
  const helpId = helpText ? `${areaId}-help` : undefined;
  const errId = error ? `${areaId}-err` : undefined;
  const ariaDesc = [helpId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={areaId} className="mb-1 block text-sm font-medium text-fg">
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}
      <TextArea
        id={areaId}
        aria-describedby={ariaDesc}
        aria-invalid={!!error}
        className={[
          'placeholder:text-[rgb(var(--fg))] dark:placeholder:text-white/70',
          error ? 'ring-1 ring-red-500' : 'focus:ring-1 focus:ring-primary',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
          rest.rows ? '' : 'min-h-[112px]',
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
        <p id={errId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
