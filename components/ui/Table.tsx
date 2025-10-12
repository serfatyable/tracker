import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={'min-w-full text-sm ' + (className || '')} {...rest} />;
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={
        'text-left sticky top-0 z-10 bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 supports-[backdrop-filter]:dark:bg-gray-900/40 ' +
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
        'border-t odd:bg-gray-50/40 hover:bg-gray-50 dark:odd:bg-gray-800/20 dark:hover:bg-gray-800/40 transition-colors ' +
        (className || '')
      }
      {...rest}
    />
  );
}

export function TH({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={'px-2 py-1 font-medium ' + (className || '')} {...rest} />;
}

export function TD({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={'px-2 py-1 ' + (className || '')} {...rest} />;
}
