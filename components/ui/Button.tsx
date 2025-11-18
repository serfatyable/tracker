'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
};

export function Button({
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  className,
  children,
  loading = false,
  disabled,
  ...rest
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none';
  const sizes: Record<Size, string> = {
    sm: 'px-3 py-2 text-sm rounded-md min-h-[36px]', // ~36px for dense UI
    md: 'px-4 py-2.5 text-sm rounded-md min-h-[44px]', // 44px min touch target
    lg: 'px-5 py-3 text-base rounded-lg min-h-[48px]', // 48px for prominent actions
  };
  const variants: Record<Variant, string> = {
    default:
      'bg-[rgb(var(--primary))] text-[rgb(var(--primary-ink))] shadow-sm hover:bg-[rgb(var(--primary))]/90 hover:shadow-md active:scale-[0.98] focus-visible:ring-[rgb(var(--primary))]',
    secondary:
      'bg-surface text-gray-900 dark:text-gray-50 hover:bg-surface/80 hover:shadow-md active:scale-[0.98] ring-1 ring-muted/20',
    outline:
      'border border-muted/30 text-gray-900 dark:text-gray-50 hover:bg-surface/70 hover:border-muted/50 active:scale-[0.98]',
    ghost: 'bg-transparent text-gray-900 dark:text-gray-50 hover:bg-surface/60 active:scale-[0.98]',
    destructive:
      'bg-red-600 text-white hover:bg-red-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-red-500',
  };

  const spinnerSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg
          className={`animate-spin ${spinnerSize}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="-ml-1">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon ? <span className="-mr-1">{rightIcon}</span> : null}
    </button>
  );
}

export default Button;
