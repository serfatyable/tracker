import type { ReactNode } from 'react';

export function createPortal(
  children: ReactNode,
  container: Element | DocumentFragment | null,
  key?: null | string,
): ReactNode;
