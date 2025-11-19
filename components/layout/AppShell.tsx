'use client';
import type { CSSProperties } from 'react';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import TopBar from '../TopBar';
import Breadcrumb from '../ui/Breadcrumb';
import CommandPalette from '../ui/CommandPalette';
import NetworkStatusIndicator from '../ui/NetworkStatusIndicator';

import { PageHeaderProvider, usePageHeaderState } from './page-header-context';
import RoleTabs from './RoleTabs';

type AppShellStyle = CSSProperties & {
  '--top-bar-offset'?: string;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PageHeaderProvider>
      <ShellFrame>{children}</ShellFrame>
    </PageHeaderProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const { data: _me } = useCurrentUserProfile();
  const { header } = usePageHeaderState();

  const shellStyle: AppShellStyle = {
    '--top-bar-offset': 'calc(env(safe-area-inset-top, 0px) + 3rem)',
  };

  const showContextualHeader = Boolean(
    header?.title || header?.description || header?.breadcrumbs?.length || header?.meta?.length,
  );

  return (
    <div className="min-h-dvh pad-safe-t pad-safe-b bg-bg text-fg" style={shellStyle}>
      <div className="top-shell" data-top-bar>
        <div className="app-container space-y-2">
          <TopBar />
          <RoleTabs />
          {showContextualHeader ? <ContextualHeader /> : null}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl">
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-6 pad-safe-b min-w-0" role="main">
          {children}
        </main>
      </div>
      <NetworkStatusIndicator show="offline-only" position="bottom" />
      <CommandPalette />
    </div>
  );
}

function ContextualHeader() {
  const { header } = usePageHeaderState();
  const { title, description, breadcrumbs, meta, actions } = header;

  return (
    <div className="contextual-header rounded-2xl border border-[rgb(var(--border))]/70 bg-[rgb(var(--surface))]/80 p-4 shadow-sm">
      {breadcrumbs?.length ? (
        <Breadcrumb
          items={breadcrumbs}
          className="mb-3 text-xs text-[rgb(var(--muted))]"
        />
      ) : null}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {title ? <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">{title}</h1> : null}
          {description ? (
            <p className="text-sm text-[rgb(var(--muted))] max-w-3xl">{description}</p>
          ) : null}
          {meta?.length ? (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Page stats">
              {meta.map((item) => (
                <li
                  key={`${item.label}-${item.value}`}
                  className={`meta-chip ${item.tone ? `meta-chip--${item.tone}` : ''}`.trim()}
                >
                  <span className="text-xs uppercase tracking-wide text-[rgb(var(--muted))]">{item.label}</span>
                  <span className="text-sm font-semibold text-[rgb(var(--fg))]">{item.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
