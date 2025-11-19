'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { BreadcrumbItemType } from '@/components/ui/Breadcrumb';

export type PageHeaderMeta = {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

export type PageHeaderConfig = {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItemType[];
  meta?: PageHeaderMeta[];
  actions?: React.ReactNode;
};

type PageHeaderContextValue = {
  header: PageHeaderConfig;
  setHeader: (config: PageHeaderConfig) => void;
  reset: () => void;
};

const defaultState: PageHeaderConfig = {};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function usePageHeader(config: PageHeaderConfig) {
  const ctx = useContext(PageHeaderContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setHeader({ ...config });
    return () => ctx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, config.title, config.description, config.actions, config.breadcrumbs, config.meta]);
}

export function usePageHeaderState() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error('usePageHeaderState must be used within PageHeaderContext');
  }
  return ctx;
}

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, setHeader] = useState<PageHeaderConfig>(defaultState);
  const reset = () => setHeader(defaultState);
  const value = useMemo(() => ({ header, setHeader, reset }), [header]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}
