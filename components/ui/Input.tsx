"use client";

import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export default function Input({ className, ...rest }: Props) {
    const base = "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700";
    return <input className={cx(base, className)} {...rest} />;
}


