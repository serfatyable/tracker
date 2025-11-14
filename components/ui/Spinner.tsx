import clsx from 'clsx';

type SpinnerProps = {
  className?: string;
  /**
   * Visually hidden label announced to assistive technologies.
   * If omitted, a generic "Loading" message is used.
   */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export default function Spinner({ className, label = 'Loading', size = 'md' }: SpinnerProps) {
  const sizeClass = sizeMap[size];

  return (
    <span className="inline-flex items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <span
        className={clsx(
          'animate-spin rounded-full border-muted/40 border-t-primary-500 dark:border-[rgb(var(--border))] dark:border-t-blue-400',
          sizeClass,
          className,
        )}
      />
    </span>
  );
}
