import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline';
};

export default function Badge({ className, variant = 'default', ...rest }: Props) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
  const variants: Record<string, string> = {
    default: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    outline: 'ring-1 ring-inset ring-gray-300 text-gray-700 dark:text-gray-200 dark:ring-gray-700',
  };
  return <span className={`${base} ${variants[variant]} ${className || ''}`} {...rest} />;
}
