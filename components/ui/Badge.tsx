import type { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'primary';

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
};

export default function Badge({ className, variant = 'default', size = 'md', ...rest }: Props) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';

  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
    secondary: 'bg-[rgb(var(--surface-elevated))] text-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    outline: 'ring-1 ring-inset ring-[rgb(var(--border))] text-[rgb(var(--fg))]',

    // Semantic status badges using our new design tokens
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    primary: 'bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] dark:bg-[rgb(var(--primary))]/20',
  };

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${variants[variant]} ${className || ''}`}
      {...rest}
    />
  );
}
