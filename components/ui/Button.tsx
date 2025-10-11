"use client";

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export function Button({ variant = 'default', size = 'md', leftIcon, rightIcon, className, children, ...rest }: Props) {
    const base = "inline-flex items-center justify-center gap-2 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
    const sizes: Record<Size, string> = {
        sm: "px-3 py-1.5 text-sm rounded-md",
        md: "px-4 py-2 text-sm rounded-md",
        lg: "px-5 py-2.5 text-base rounded-lg"
    };
    const variants: Record<Variant, string> = {
        default: "bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
        outline: "border border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800",
        ghost: "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
    };
    return (
        <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
            {leftIcon ? <span className="-ml-1">{leftIcon}</span> : null}
            <span>{children}</span>
            {rightIcon ? <span className="-mr-1">{rightIcon}</span> : null}
        </button>
    );
}

export default Button;


