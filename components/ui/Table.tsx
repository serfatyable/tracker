import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
    return <table className={"min-w-full text-sm " + (className || "")} {...rest} />;
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={"text-left " + (className || "")} {...rest} />;
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={className} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
    return <tr className={"border-t " + (className || "")} {...rest} />;
}

export function TH({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
    return <th className={"px-2 py-1 font-medium " + (className || "")} {...rest} />;
}

export function TD({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
    return <td className={"px-2 py-1 " + (className || "")} {...rest} />;
}


