"use client";

import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export default function Select({ className, ...rest }: Props) {
    const base = "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700";
    return <select className={cx(base, className)} {...rest} />;
}


