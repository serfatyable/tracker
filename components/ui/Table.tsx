import type { HTMLAttributes, TableHTMLAttributes } from 'react';

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={'min-w-full text-sm text-fg ' + (className || '')} {...rest} />;
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={
        'text-left sticky top-0 z-10 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70 border-b border-muted/20 ' +
        (className || '')
      }
      {...rest}
    />
  );
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={
        'border-t border-muted/20 odd:bg-bg hover:bg-surface/70 transition-colors ' +
        'focus-within:bg-surface/70 focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-inset ' +
        (className || '')
      }
      {...rest}
    />
  );
}

export function TH({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={'px-2 sm:px-3 py-2 font-medium text-fg whitespace-nowrap ' + (className || '')}
      {...rest}
    />
  );
}

export function TD({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={'px-2 sm:px-3 py-2 ' + (className || '')} {...rest} />;
}

// Wrapper for making tables scrollable on mobile
export function TableWrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={'overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 ' + (className || '')}>
      {children}
    </div>
  );
}

export function TableEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 text-sm text-muted flex items-center justify-center border rounded">
      {children}
    </div>
  );
}
